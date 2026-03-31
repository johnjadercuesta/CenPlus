import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getTokenFromRequest(request);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    email: payload.email,
    nombre: payload.nombre,
    role: payload.role,
  });
}
