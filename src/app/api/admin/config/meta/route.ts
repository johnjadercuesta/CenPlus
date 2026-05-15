import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'administrador') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = getTenantFromRequest(request);
    const { valor } = await request.json();

    if (!valor) {
      return NextResponse.json({ error: "Valor requerido" }, { status: 400 });
    }

    // Actualizar en la tabla config del tenant
    await queryWithTenant(tenant!, `
      INSERT INTO config (clave, valor) VALUES ('meta_global', $1)
      ON CONFLICT (clave) DO UPDATE SET valor = $1
    `, [valor]);

    return NextResponse.json({ success: true, message: "Meta actualizada" });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
