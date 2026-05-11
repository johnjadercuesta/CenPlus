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
  // If token is not bound to any tenant, it's considered global and allowed.
  if (!payload.tenant) return true;
  // If token has a tenant, it must match the request tenant exactly.
  return payload.tenant === tenant;
}
