import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pais = searchParams.get("pais") || "Colombia";

    const { rows } = await pool.query(
      `SELECT DISTINCT departamento FROM global_trends 
       WHERE pais ILIKE $1 AND departamento IS NOT NULL AND departamento != ''
       ORDER BY departamento ASC`,
      [pais]
    );

    return NextResponse.json({ departamentos: rows.map(r => r.departamento) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener departamentos" }, { status: 500 });
  }
}
