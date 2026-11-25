import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/trendsmap/cleanup called");
    const auth = await requireRole(request, ["administrador", "estratega"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;
    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    const result = await run(`
      DELETE FROM trendsmap_entries
      WHERE id NOT IN (
        SELECT DISTINCT ON (text, latitude, longitude) id
        FROM trendsmap_entries
        ORDER BY text, latitude, longitude, created_at DESC
      )
    `);

    console.log(`[cleanup] Eliminados ${result.rowCount} registros duplicados`);

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
