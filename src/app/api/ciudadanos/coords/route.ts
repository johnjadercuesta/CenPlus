import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const archivoId = searchParams.get("archivo_id");

    let rows: any[];

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    if (archivoId) {
      const archivoRes = await run(
        "SELECT snapshot FROM archivos_electorales WHERE id = $1",
        [archivoId]
      );
      if (archivoRes.rows.length === 0) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }
      const snapshot = archivoRes.rows[0].snapshot;
      rows = (snapshot.ciudadanos || []).filter(
        (c: any) => c.latitud != null && c.longitud != null
      );
    } else {
      const result = await run(
        "SELECT latitud, longitud, es_lider, problematica_principal FROM ciudadanos WHERE latitud IS NOT NULL AND longitud IS NOT NULL"
      );
      rows = result.rows;
    }

    const mapped = rows.map((c: any) => ({
      latitud: c.latitud,
      longitud: c.longitud,
      es_lider: c.es_lider === 1,
      problematica_principal: c.problematica_principal
    }));

    const response = NextResponse.json({ data: mapped, count: mapped.length });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
