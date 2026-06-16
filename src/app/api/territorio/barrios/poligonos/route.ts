import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Contexto no válido" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, `
      SELECT b.id, b.nombre, b.comuna_id, b.poligono, c.nombre AS comuna_nombre, c.tipo AS comuna_tipo,
        (SELECT COUNT(*)::int FROM ciudadanos WHERE id_barrio = b.id) AS total_ciudadanos
      FROM barrios b
      JOIN comunas c ON c.id = b.comuna_id
      WHERE b.poligono IS NOT NULL
      ORDER BY c.nombre, b.nombre
    `);

    // Parse poligono from TEXT to array
    const data = rows.map((r: any) => ({
      ...r,
      poligono: r.poligono ? JSON.parse(r.poligono) : null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[barrios poligonos GET]", err);
    return NextResponse.json({ error: "Error al obtener polígonos de barrios" }, { status: 500 });
  }
}
