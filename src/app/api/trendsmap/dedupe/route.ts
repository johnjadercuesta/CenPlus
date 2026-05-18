import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/trendsmap/dedupe called");
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaci�n" }, { status: 403 });

    // Crear extensión para búsqueda fuzzy (si no existe)
    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    await run(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // Paso 1: Encontrar entradas similares (> 80% similitud)
    const { rows: similarGroups } = await run(`
      SELECT 
        a.id as id1,
        b.id as id2,
        a.text as text1,
        b.text as text2,
        SIMILARITY(a.text, b.text) as similarity
      FROM trendsmap_entries a
      JOIN trendsmap_entries b ON a.id < b.id
      WHERE SIMILARITY(a.text, b.text) > 0.80
        AND a.latitude = b.latitude
        AND a.longitude = b.longitude
      ORDER BY similarity DESC
    `);

    console.log(`[dedupe] Encontrados ${similarGroups.length} pares similares`);

    let merged = 0;

    // Paso 2: Para cada grupo de similares, mantener el más reciente y eliminar los otros
    for (const group of similarGroups) {
      try {
        // Mantener el más reciente, eliminar el más viejo
        const idToDelete = group.id1;
        const idToKeep = group.id2;

        await run(
          `DELETE FROM trendsmap_entries WHERE id = $1`,
          [idToDelete]
        );
        merged++;
      } catch (err) {
        console.warn(`[dedupe] Error merging ${group.id1} and ${group.id2}:`, err);
      }
    }

    // Paso 3: Normalizar textos - remover variaciones comunes
    const normalizationRules = [
      { pattern: / - (Turbo|Caucasia|Medellín|Bogotá)$/i, replacement: '' },
      { pattern: / \(Parte \d+\)$/i, replacement: '' },
      { pattern: / - .*\d{4}$/i, replacement: '' }, // Remover año al final
    ];

    let normalized = 0;
    for (const rule of normalizationRules) {
      const result = await run(
        `UPDATE trendsmap_entries 
         SET text = REGEXP_REPLACE(text, $1, $2, 'gi')
         WHERE text ~ $1`,
        [rule.pattern.source, rule.replacement]
      );
      normalized += result.rowCount || 0;
    }

    // Obtener estadísticas finales
    const stats = await run(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT LOWER(text)) as unique_trends,
        COUNT(DISTINCT departamento) as departments,
        COUNT(DISTINCT municipio) as municipalities
      FROM trendsmap_entries
    `);

    return NextResponse.json({
      success: true,
      message: `Merged ${merged} similar entries, normalized ${normalized} texts`,
      merged,
      normalized,
      stats: stats.rows[0],
    });
  } catch (error: any) {
    console.error("[API] Error in dedupe:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
