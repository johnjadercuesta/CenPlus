import { NextRequest, NextResponse } from "next/server";
import { requireAnyModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAnyModule(request, [
      "dashboard",
      "sectores",
      "mapa",
      "registros",
      "inteligencia",
      "escala",
      "archivos",
    ]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const { searchParams } = new URL(request.url);
    const archivoId = searchParams.get("archivo_id");

    const { rows: configRows } = await queryWithTenant(tenant, "SELECT valor FROM config WHERE clave = 'meta_global'");
    const metaGlobal = configRows.length > 0 ? parseInt(configRows[0].valor) : 1000;

    let sectorStats: any[];

    if (archivoId) {
      const archivoRes = await queryWithTenant(tenant,
        "SELECT snapshot FROM archivos_electorales WHERE id = $1",
        [archivoId]
      );
      if (archivoRes.rows.length === 0) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }
      const rawSnapshot = archivoRes.rows[0].snapshot;
      const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
      const sectores = snapshot.sectores || [];
      const ciudadanos = snapshot.ciudadanos || [];

      sectorStats = sectores.map((s: any) => {
        const registros = ciudadanos.filter((c: any) => c.barrio?.toLowerCase().includes(s.nombre.toLowerCase())).length;
        const porcentaje = s.meta > 0 ? Math.round((registros / s.meta) * 1000) / 10 : 0;
        const brecha = (s.votos_historicos || 0) - registros;

        return {
          id: s.id,
          nombre: s.nombre,
          meta: s.meta,
          votosHistoricos: s.votos_historicos || 0,
          brecha: brecha > 0 ? brecha : 0,
          latitud: s.latitud,
          longitud: s.longitud,
          radio: s.radio,
          poligono: s.poligono ? (typeof s.poligono === 'string' ? JSON.parse(s.poligono) : s.poligono) : null,
          color: s.color,
          activo: s.activo,
          registros,
          porcentaje,
          estado: porcentaje >= 80 ? "cumpliendo" : porcentaje >= 30 ? "en_progreso" : "critico",
          zona: s.zona || 'urbana',
        };
      });
    } else {
      const { rows: sectores } = await queryWithTenant(tenant, `
        SELECT 
          s.*,
          (SELECT COUNT(*) FROM ciudadanos c WHERE (s.barrio_id IS NOT NULL AND c.id_barrio = s.barrio_id) OR c.barrio ILIKE '%' || s.nombre || '%') as registros
        FROM sectores s
        WHERE s.activo = 1
        ORDER BY s.nombre
      `);

      sectorStats = sectores.map((s: any) => {
        const registros = parseInt(s.registros || "0");
        const porcentaje = s.meta > 0 ? Math.round((registros / s.meta) * 1000) / 10 : 0;
        const brecha = (s.votos_historicos || 0) - registros;

        return {
          id: s.id,
          nombre: s.nombre,
          meta: s.meta,
          votosHistoricos: s.votos_historicos || 0,
          brecha: brecha > 0 ? brecha : 0,
          latitud: s.latitud,
          longitud: s.longitud,
          radio: s.radio,
          poligono: s.poligono ? JSON.parse(s.poligono) : null,
          color: s.color,
          activo: s.activo,
          registros,
          porcentaje,
          estado: porcentaje >= 80 ? "cumpliendo" : porcentaje >= 30 ? "en_progreso" : "critico",
          zona: s.zona || 'urbana',
        };
      });
    }

    const response = NextResponse.json({ metaGlobal, sectorStats });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
