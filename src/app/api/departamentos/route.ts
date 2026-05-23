import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pais = searchParams.get("pais") || "Colombia";

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT departamento FROM global_trends 
       WHERE pais ILIKE $1 AND departamento IS NOT NULL AND departamento != ''
         AND (tenant = $2 OR tenant IS NULL)
       ORDER BY departamento ASC`,
      [pais, tenant]
    );

    return NextResponse.json({ departamentos: rows.map(r => r.departamento) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener departamentos" }, { status: 500 });
  }
}
