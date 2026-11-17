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
    const corporacionBase = searchParams.get("base") || "concejo";
    const corporacionMeta = searchParams.get("meta") || "alcaldia";

    // Matriz de cruce: Por cada candidato de la corporación base, cuántos votos van para los candidatos de la corporación meta
    const sql = `
      SELECT 
        c_base.id AS base_id,
        c_base.nombre AS base_nombre,
        c_base.corporacion AS base_corporacion,
        c_base.numero_tarjeton AS base_tarjeton,
        c_meta.id AS meta_id,
        c_meta.nombre AS meta_nombre,
        c_meta.corporacion AS meta_corporacion,
        COUNT(DISTINCT a_base.ciudadano_id)::int AS votos_coincidentes
      FROM apoyos_electorales a_base
      JOIN corporaciones_candidatos c_base ON c_base.id = a_base.candidato_id
      JOIN apoyos_electorales a_meta ON a_meta.ciudadano_id = a_base.ciudadano_id
      JOIN corporaciones_candidatos c_meta ON c_meta.id = a_meta.candidato_id
      WHERE c_base.corporacion = $1 
        AND c_meta.corporacion = $2
        AND c_base.activo = 1 
        AND c_meta.activo = 1
      GROUP BY c_base.id, c_base.nombre, c_base.corporacion, c_base.numero_tarjeton, c_meta.id, c_meta.nombre, c_meta.corporacion
      ORDER BY c_base.nombre, votos_coincidentes DESC
    `;

    const { rows } = await queryWithTenant(tenant, sql, [corporacionBase, corporacionMeta]);

    return NextResponse.json({ 
      data: rows,
      parametros: { base: corporacionBase, meta: corporacionMeta }
    });
  } catch (err: any) {
    console.error("[apoyos/cruce GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
