import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/trendsmap/cleanup called");
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Limpiar duplicados: mantener solo 1 registro por (text, latitude, longitude)
    const result = await pool.query(`
      DELETE FROM trendsmap_entries
      WHERE id NOT IN (
        SELECT DISTINCT ON (text, latitude, longitude) id
        FROM trendsmap_entries
        ORDER BY text, latitude, longitude, created_at DESC
      )
    `);

    console.log(`[cleanup] Eliminados ${result.rowCount} registros duplicados`);

    // Obtener estadísticas finales
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT departamento) as departments,
        COUNT(DISTINCT municipio) as municipalities
      FROM trendsmap_entries
    `);

    return NextResponse.json({
      success: true,
      message: `Eliminados ${result.rowCount} duplicados`,
      stats: stats.rows[0],
    });
  } catch (error: any) {
    console.error("[API] Error in cleanup:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
