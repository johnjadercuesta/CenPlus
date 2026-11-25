import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { pool } from "@/lib/db";
import {
  AccessUser,
  DiaDLevel,
  ModuleId,
  Role,
  canAccessAnyModule,
  canAccessDiaD,
  canAccessModule,
  getEffectiveModuleIds,
  getReadOnlyModuleIds,
  isRole,
  normalizeDiaDLevel,
} from "@/lib/modules";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not defined in production environment");
}
const SECRET = JWT_SECRET || "cenplus-secret-change-me-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  nombre: string;
  role: Role;
  tenant?: string | null;
  /** Versión de sesión del usuario (rol/estado/password). */
  sessionVersion?: number;
  /** Versión de sesión del tenant (activación/desactivación). */
  tenantVersion?: number;
}

export interface CurrentUser extends AccessUser {
  userId: number;
  email: string;
  nombre: string;
  role: Role;
  tenant: string;
  dia_d_level: DiaDLevel;
  sessionVersion: number;
  modules: ModuleId[];
  readOnlyModules: ModuleId[];
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "24h" });
}

export function signTokenWithVersion(
  payload: JwtPayload,
  sessionVersion: number,
  tenantVersion: number = 0
): string {
  return jwt.sign(
    { ...payload, sessionVersion, tenantVersion },
    SECRET,
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }

  const cookie = request.cookies.get("token");
  if (cookie) {
    return verifyToken(cookie.value);
  }

  return null;
}

export function tokenMatchesTenant(payload: JwtPayload | null, request?: NextRequest | string | undefined): boolean {
  if (!payload) return false;
  if (!request) return true;

  // Super-admin userId === 0 is exempt from tenant checks
  if (payload.userId === 0) return true;

  const tenant = getTenantFromRequest(request as any);

  // Para todos los demás, el tenant debe coincidir exactamente.
  return payload.tenant === tenant;
}

function buildUser(
  data: {
    userId: number;
    email: string;
    nombre: string;
    role: Role;
    tenant: string;
    dia_d_level: DiaDLevel;
    sessionVersion: number;
  }
): CurrentUser {
  const user: CurrentUser = {
    ...data,
    modules: [],
    readOnlyModules: [],
  };
  user.modules = getEffectiveModuleIds(user);
  user.readOnlyModules = getReadOnlyModuleIds(user);
  return user;
}

/**
 * Devuelve el usuario autenticado validando SIEMPRE contra la base de datos.
 * El rol del JWT no se usa para autorizar: puede haber cambiado o el usuario
 * puede haber sido desactivado. También se valida la versión de sesión del
 * usuario (se incrementa al cambiar rol, estado o contraseña).
 */
export async function getCurrentUser(
  request: NextRequest
): Promise<CurrentUser | null> {
  const payload = getTokenFromRequest(request);
  if (!payload) return null;
  if (!tokenMatchesTenant(payload, request)) return null;

  const tenant = getTenantFromRequest(request) || payload.tenant || "";

  if (payload.userId === 0) {
    return buildUser({
      userId: 0,
      email: payload.email || "superadmin",
      nombre: payload.nombre || "Super Admin",
      role: "administrador",
      tenant,
      dia_d_level: "coordinador",
      sessionVersion: Number(payload.sessionVersion ?? 0),
    });
  }

  if (!tenant) return null;

  let row: any;
  try {
    const { rows } = await pool.query(
      `SELECT id, email, nombre, role, activo,
              COALESCE(session_version, 0) AS session_version,
              COALESCE(dia_d_level, 'none') AS dia_d_level
         FROM "${tenant}".admins
        WHERE id = $1`,
      [payload.userId]
    );
    row = rows[0];
  } catch {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, nombre, role, activo
           FROM "${tenant}".admins
          WHERE id = $1`,
        [payload.userId]
      );
      row = rows[0];
    } catch {
      return null;
    }
  }

  if (!row) return null;
  if (row.activo === 0 || row.activo === false) return null;
  if (!isRole(row.role)) return null;

  const dbVersion = Number(row.session_version ?? 0);
  const tokenVersion = Number(payload.sessionVersion ?? 0);
  if (dbVersion > tokenVersion) return null;

  return buildUser({
    userId: Number(row.id),
    email: row.email,
    nombre: row.nombre,
    role: row.role,
    tenant,
    dia_d_level: normalizeDiaDLevel(row.dia_d_level),
    sessionVersion: dbVersion,
  });
}

function unauthorized(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Acceso no autorizado para este módulo") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type GuardResult =
  | { user: CurrentUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

export async function requireModule(
  request: NextRequest,
  moduleId: ModuleId
): Promise<GuardResult> {
  const user = await getCurrentUser(request);
  if (!user) return { error: unauthorized() };
  if (!canAccessModule(user, moduleId)) return { error: forbidden() };
  return { user };
}

export async function requireRole(
  request: NextRequest,
  roles: Role[]
): Promise<GuardResult> {
  const user = await getCurrentUser(request);
  if (!user) return { error: unauthorized() };
  if (!roles.includes(user.role)) return { error: forbidden() };
  return { user };
}

export async function requireAnyModule(
  request: NextRequest,
  moduleIds: ModuleId[]
): Promise<GuardResult> {
  const user = await getCurrentUser(request);
  if (!user) return { error: unauthorized() };
  if (!canAccessAnyModule(user, moduleIds)) return { error: forbidden() };
  return { user };
}

export async function requireDiaDLevel(
  request: NextRequest,
  minLevel: "testigo" | "coordinador" = "testigo"
): Promise<GuardResult> {
  const user = await getCurrentUser(request);
  if (!user) return { error: unauthorized() };
  if (!canAccessDiaD(user, minLevel)) {
    return {
      error: forbidden(
        minLevel === "coordinador"
          ? "Se requiere nivel Coordinador de Día D"
          : "No tienes acceso a la Operación Día D"
      ),
    };
  }
  return { user };
}

/**
 * Autoriza operaciones de super administrador de plataforma.
 * Acepta la clave x-super-key o un JWT con userId === 0.
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<GuardResult> {
  const superKey = process.env.SUPER_ADMIN_KEY || "";
  const headerKey = request.headers.get("x-super-key") || "";
  if (superKey && headerKey === superKey) {
    return {
      user: buildUser({
        userId: 0,
        email: "superadmin",
        nombre: "Super Admin",
        role: "administrador",
        tenant: getTenantFromRequest(request) || "",
        dia_d_level: "coordinador",
        sessionVersion: 0,
      }),
    };
  }

  const user = await getCurrentUser(request);
  if (user && user.userId === 0) return { user };

  return { error: unauthorized("Acceso Denegado. Se requiere SUPER_ADMIN_KEY válida.") };
}
