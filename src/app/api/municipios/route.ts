import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pais = searchParams.get("pais") || "Colombia";
    const depto = searchParams.get("departamento");

    let query = `
      SELECT DISTINCT ciudad, departamento, pais, latitude, longitude
      FROM global_trends
      WHERE ciudad IS NOT NULL AND ciudad != ''
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND pais ILIKE $1
    `;
    const params = [pais];

    if (depto) {
      params.push(depto);
      query += ` AND departamento ILIKE $${params.length}`;
    }

    query += ` ORDER BY ciudad ASC`;

    const tenant = getTenantFromRequest(request);
    const res = tenant ? await queryWithTenant(tenant, query, params) : await pool.query(query, params);
    return NextResponse.json({ municipios: res.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener municipios" }, { status: 500 });
  }
}
