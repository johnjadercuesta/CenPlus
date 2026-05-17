import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/trendsmap/cleanup called");
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    // Limpiar duplicados: mantener solo 1 registro por (text, latitude, longitude)
    const result = await run(`
      DELETE FROM trendsmap_entries
      WHERE id NOT IN (
        SELECT DISTINCT ON (text, latitude, longitude) id
        FROM trendsmap_entries
        ORDER BY text, latitude, longitude, created_at DESC
      )
    `);

    console.log(`[cleanup] Eliminados ${result.rowCount} registros duplicados`);

    // Obtener estadísticas finales
    const stats = await run(`
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
