import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pais = searchParams.get("pais") || "Colombia";
    const depto = searchParams.get("departamento");

    let query = `
      SELECT DISTINCT ciudad, departamento, latitude, longitude
      FROM global_trends
      WHERE pais ILIKE $1 AND ciudad IS NOT NULL AND ciudad != ''
    `;
    const params = [pais];

    if (depto) {
      params.push(depto);
      query += ` AND departamento ILIKE $${params.length}`;
    }

    query += ` ORDER BY ciudad ASC`;

    const tenant = getTenantFromRequest(request);
    const res = tenant ? await queryWithTenant(tenant, query, params) : await pool.query(query, params);
    return NextResponse.json({ ciudades: res.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener ciudades" }, { status: 500 });
  }
}
