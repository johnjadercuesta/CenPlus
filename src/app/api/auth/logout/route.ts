import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { getTokenFromRequest } = await import("@/lib/auth");
  const payload = getTokenFromRequest(request);

  if (payload && payload.tenant) {
    const { recordLog } = await import("@/lib/audit");
    await recordLog({
      tenant: payload.tenant,
      email: payload.email || "desconocido",
      nombre: payload.nombre || "Usuario",
      modulo: "autenticación",
      accion: "Cerró sesión en el sistema",
    });
  }

  const response = NextResponse.json({ message: "Sesión cerrada" });
  response.cookies.set("token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
