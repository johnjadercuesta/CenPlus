import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const ciudadanoId = searchParams.get("ciudadano_id");

    if (ciudadanoId) {
      const sql = `
        SELECT a.*, c.nombre AS candidato_nombre, c.corporacion, c.numero_tarjeton, c.partido
        FROM apoyos_electorales a
        JOIN corporaciones_candidatos c ON c.id = a.candidato_id
        WHERE a.ciudadano_id = $1
      `;
      const { rows } = await queryWithTenant(tenant, sql, [ciudadanoId]);
      return NextResponse.json({ data: rows });
    }

    // Resumen consolidado de apoyos por candidato
    const sql = `
      SELECT 
        c.id, c.nombre, c.corporacion, c.numero_tarjeton, c.partido,
        COUNT(a.id)::int AS total_apoyos,
        COUNT(CASE WHEN a.nivel_compromiso = 'seguro' THEN 1 END)::int AS apoyos_seguros,
        COUNT(CASE WHEN a.nivel_compromiso = 'probable' THEN 1 END)::int AS apoyos_probables,
        COUNT(CASE WHEN a.nivel_compromiso = 'indeciso' THEN 1 END)::int AS apoyos_indecisos
      FROM corporaciones_candidatos c
      LEFT JOIN apoyos_electorales a ON a.candidato_id = c.id
      WHERE c.activo = 1
      GROUP BY c.id, c.nombre, c.corporacion, c.numero_tarjeton, c.partido
      ORDER BY total_apoyos DESC
    `;
    const { rows } = await queryWithTenant(tenant, sql, []);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[apoyos GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const { ciudadano_id, candidatos, nivel_compromiso } = body;

    if (!ciudadano_id || !Array.isArray(candidatos) || candidatos.length === 0) {
      return NextResponse.json({ error: "Cédula del ciudadano y lista de candidatos son requeridos" }, { status: 400 });
    }

    const liderId = token.userId;

    // Eliminar apoyos previos si se están reemplazando
    await queryWithTenant(tenant, "DELETE FROM apoyos_electorales WHERE ciudadano_id = $1", [ciudadano_id]);

    for (const candId of candidatos) {
      const cId = parseInt(candId);
      if (isNaN(cId)) continue;
      await queryWithTenant(
        tenant,
        `INSERT INTO apoyos_electorales (ciudadano_id, candidato_id, lider_id, nivel_compromiso)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ciudadano_id, candidato_id) DO UPDATE SET nivel_compromiso = EXCLUDED.nivel_compromiso`,
        [ciudadano_id, cId, liderId, nivel_compromiso || 'seguro']
      );
    }

    return NextResponse.json({ message: "Apoyos electorales registrados correctamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[apoyos POST] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
