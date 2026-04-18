import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "cenplus-secret-change-me-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  nombre: string;
  role: "administrador" | "estratega" | "lider";
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
