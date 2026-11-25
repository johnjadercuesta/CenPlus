import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModule(request, "mensajeria");
    if (auth.error) return auth.error;
    const user = auth.user;

    const { rows } = await queryWithTenant(user.tenant,
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
