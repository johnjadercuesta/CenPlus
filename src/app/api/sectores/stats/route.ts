import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();

    const metaRow = db.prepare("SELECT valor FROM config WHERE clave = 'meta_global'").get() as { valor: string } | undefined;
    const metaGlobal = metaRow ? parseInt(metaRow.valor) : 1000;

    // Consulta optimizada: Obtiene los sectores y cuenta los ciudadanos vinculados por nombre de barrio
    const sectores = db.prepare(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM ciudadanos c WHERE c.barrio = s.nombre COLLATE NOCASE) as registros
      FROM sectores s
      WHERE s.activo = 1
      ORDER BY s.nombre
    `).all() as {
      id: number; nombre: string; meta: number; latitud: number; longitud: number;
      radio: number; poligono: string | null; activo: number; registros: number;
    }[];

    const sectorStats = sectores.map((s) => {
      const porcentaje = s.meta > 0 ? Math.round((s.registros / s.meta) * 1000) / 10 : 0;
      return {
        id: s.id,
        nombre: s.nombre,
        meta: s.meta,
        latitud: s.latitud,
        longitud: s.longitud,
        radio: s.radio,
        poligono: s.poligono ? JSON.parse(s.poligono) : null,
        activo: s.activo,
        registros: s.registros,
        porcentaje,
        estado: porcentaje >= 80 ? "cumpliendo" : porcentaje >= 30 ? "en_progreso" : "critico",
      };
    });

    const response = NextResponse.json({ metaGlobal, sectorStats });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
