import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not defined in production environment");
}
const SECRET = JWT_SECRET || "cenplus-secret-change-me-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  nombre: string;
  role: "administrador" | "estratega" | "lider";
  tenant?: string | null;
  sessionVersion?: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "24h" });
}

export function signTokenWithVersion(payload: JwtPayload, sessionVersion: number): string {
  return jwt.sign({ ...payload, sessionVersion }, SECRET, { expiresIn: "24h" });
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
