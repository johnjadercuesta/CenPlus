import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || "cenplus-secret-change-me-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  nombre: string;
  role: "administrador" | "estratega" | "lider";
  tenant?: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
  
  const tenant = getTenantFromRequest(request as any);
  
  // 1. Si el token no tiene tenant, es global y se permite.
  if (!payload.tenant) return true;
  
  // 2. Si el usuario es administrador, permitimos flexibilidad para evitar bloqueos en configuración
  if (payload.role === 'administrador') return true;
  
  // 3. Para otros roles, el tenant debe coincidir exactamente.
  return payload.tenant === tenant;
}
