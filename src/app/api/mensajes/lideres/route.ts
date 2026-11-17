import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenant = payload.tenant as string;
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no detectado" }, { status: 400 });
    }

    const { rows } = await queryWithTenant(tenant,
      `SELECT a.id, a.nombre, a.identificacion,
        (SELECT COUNT(*) FROM ciudadanos c WHERE c.lider_id = a.id) as ciudadanos_count
      FROM admins a
      WHERE a.role = 'lider' AND a.activo = 1
      ORDER BY a.nombre ASC`
    );

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[mensajes/lideres] Error:", err?.message || err);
    return NextResponse.json({ error: "Error al obtener líderes" }, { status: 500 });
  }
}
