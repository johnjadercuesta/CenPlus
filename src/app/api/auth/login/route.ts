import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signTokenWithVersion } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";
import bcrypt from "bcryptjs";
import { logLogin, recordFailedLogin, recordSystemEvent } from "@/lib/audit";
import {
  Role,
  getDefaultRoute,
  getEffectiveModuleIds,
  normalizeDiaDLevel,
} from "@/lib/modules";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  const device = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") ? "Mobile" : "Desktop";
  
  return { browser, os, device };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(userAgent);

  try {
    const { identificacion, password, tenant: tenantParam } = await request.json();

    if (!identificacion || !password) {
      await recordFailedLogin({ identificacion: identificacion || "unknown", ipAddress, userAgent, reason: "missing_fields" });
      return NextResponse.json(
        { error: "Identificacion y contrasena son obligatorios" },
        { status: 400 }
      );
    }

    let tenant = sanitizeTenantValue(tenantParam) || getTenantFromRequest(request);

    if (!tenant) {
      try {
        const { rows: tenantRows } = await pool.query(
          "SELECT tenant FROM public.user_tenants WHERE (identificacion = $1 OR email = $1) LIMIT 1",
          [identificacion]
        );
        if (tenantRows.length > 0) {
          tenant = tenantRows[0].tenant;
        }
      } catch (e) {
      }
    }

    if (!tenant) {
      try {
        const { rows: schemas } = await pool.query(`
          SELECT schema_name FROM information_schema.schemata
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            AND schema_name NOT LIKE 'pg_%'
          ORDER BY schema_name = 'public' DESC, schema_name
        `);

        for (const s of schemas) {
          const schemaName = s.schema_name;
          try {
            const { rows: users } = await pool.query(
              `SELECT id FROM "${schemaName}".admins WHERE (identificacion = $1 OR email = $1) AND activo = 1 LIMIT 1`,
              [identificacion]
            );
            if (users.length > 0) {
              tenant = schemaName;
              break;
            }
          } catch {
          }
        }
      } catch (e) {
      }
    }

    if (!tenant) {
      await recordFailedLogin({ identificacion, ipAddress, userAgent, reason: "tenant_not_found" });
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    // Verificar si la organizacion esta activa
    try {
      const { rows: tc } = await pool.query(
        'SELECT activo FROM public.tenants_config WHERE tenant = $1',
        [tenant]
      );
      if (tc.length > 0 && tc[0].activo === false) {
        await recordFailedLogin({ tenant, identificacion, ipAddress, userAgent, reason: "tenant_disabled" });
        return NextResponse.json(
          { error: "Organización deshabilitada. Contacte al administrador." },
          { status: 403 }
        );
      }
    } catch { /* table may not exist */ }

    let sessionVersion = 0;
    try {
      const { rows: sv } = await pool.query(
        'SELECT session_version FROM public.tenants_config WHERE tenant = $1',
        [tenant]
      );
      if (sv.length > 0) sessionVersion = sv[0].session_version ?? 0;
    } catch { /* table may not exist */ }

    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    const { rows } = await run(
      "SELECT * FROM admins WHERE (identificacion = $1 OR email = $1) AND activo = 1",
      [identificacion]
    );
    const user = rows[0] as { id: number; email: string; password: string; nombre: string; role: string } | undefined;

    if (!user) {
      await recordFailedLogin({ tenant, identificacion, ipAddress, userAgent, reason: "user_not_found" });
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      await recordFailedLogin({ tenant, identificacion, ipAddress, userAgent, reason: "invalid_password" });
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const userSessionVersion = Number((user as any).session_version ?? 0);
    const diaDLevel = normalizeDiaDLevel((user as any).dia_d_level);
    const accessUser = { role: user.role as Role, dia_d_level: diaDLevel };

    const token = signTokenWithVersion({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role as Role,
      tenant: tenant || null,
    }, userSessionVersion, sessionVersion);

    const response = NextResponse.json({
      token,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      dia_d_level: diaDLevel,
      modules: getEffectiveModuleIds(accessUser),
      defaultRoute: getDefaultRoute(accessUser),
    });
    
    await logLogin({
      tenant,
      userId: user.id,
      userEmail: user.email,
      userName: user.nombre,
      userRole: user.role,
      ipAddress,
      userAgent,
      browser,
      os,
    });

    await recordSystemEvent({
      eventType: "login_success",
      source: "auth",
      message: `Usuario ${user.email} inicio sesion desde ${ipAddress}`,
      durationMs: Date.now() - startTime,
    });
    
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[login] Error:", err.message);
    await recordSystemEvent({
      eventType: "login_error",
      source: "auth",
      message: err.message,
      severity: "error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Error interno: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
