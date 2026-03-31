import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    const total = (db.prepare("SELECT COUNT(*) as c FROM ciudadanos").get() as { c: number }).c;
    const lideres = (db.prepare("SELECT COUNT(*) as c FROM ciudadanos WHERE es_lider = 1").get() as { c: number }).c;
    const conCoords = (db.prepare("SELECT COUNT(*) as c FROM ciudadanos WHERE latitud IS NOT NULL").get() as { c: number }).c;
    const hoy = (db.prepare("SELECT COUNT(*) as c FROM ciudadanos WHERE date(created_at) = date('now')").get() as { c: number }).c;
    const semana = (db.prepare("SELECT COUNT(*) as c FROM ciudadanos WHERE created_at >= datetime('now', '-7 days')").get() as { c: number }).c;

    // Por nivel de estudios
    const porEstudios = db
      .prepare("SELECT nivel_estudios, COUNT(*) as c FROM ciudadanos WHERE nivel_estudios IS NOT NULL GROUP BY nivel_estudios ORDER BY c DESC")
      .all() as { nivel_estudios: string; c: number }[];

    // Por sexo
    const porSexo = db
      .prepare("SELECT sexo, COUNT(*) as c FROM ciudadanos WHERE sexo IS NOT NULL GROUP BY sexo")
      .all() as { sexo: string; c: number }[];

    // Top barrios unificados (case-insensitive)
    const topBarrios = db
      .prepare("SELECT barrio, COUNT(*) as c FROM ciudadanos GROUP BY barrio COLLATE NOCASE ORDER BY c DESC LIMIT 10")
      .all() as { barrio: string; c: number }[];

    // Top corregimientos
    const topCorregimientos = db
      .prepare("SELECT corregimiento, COUNT(*) as c FROM ciudadanos GROUP BY corregimiento ORDER BY c DESC LIMIT 10")
      .all() as { corregimiento: string; c: number }[];

    // Top ocupaciones
    const topOcupaciones = db
      .prepare("SELECT ocupacion, COUNT(*) as c FROM ciudadanos WHERE ocupacion IS NOT NULL AND ocupacion != '' GROUP BY ocupacion ORDER BY c DESC LIMIT 10")
      .all() as { ocupacion: string; c: number }[];

    // Por líder
    const porLider = db
      .prepare(`
        SELECT a.nombre, COUNT(c.id) as c
        FROM ciudadanos c
        LEFT JOIN admins a ON c.lider_id = a.id
        WHERE c.lider_id IS NOT NULL
        GROUP BY c.lider_id
        ORDER BY c DESC
      `)
      .all() as { nombre: string; c: number }[];

    // Registros últimos 7 días (por día)
    const ultimos7dias: { fecha: string; c: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const row = db
        .prepare(`SELECT COUNT(*) as c FROM ciudadanos WHERE date(created_at) = date('now', '-${i} days')`)
        .get() as { c: number };
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      ultimos7dias.push({
        fecha: fecha.toLocaleDateString("es-CO", { weekday: "short" }),
        c: row.c,
      });
    }

    // Meta desde config
    const metaRow = db.prepare("SELECT valor FROM config WHERE clave = 'meta_global'").get() as { valor: string } | undefined;
    const meta = metaRow ? parseInt(metaRow.valor) : 1000;
    const porcentajeMeta = Math.round((total / meta) * 1000) / 10;
    const avgEdad = db.prepare("SELECT AVG(edad) as avg FROM ciudadanos WHERE edad IS NOT NULL").get() as { avg: number | null };

    const response = NextResponse.json({
      total,
      lideres,
      conCoords,
      hoy,
      semana,
      meta,
      porcentajeMeta,
      avgEdad: avgEdad.avg ? Math.round(avgEdad.avg) : 0,
      porEstudios,
      porSexo,
      topBarrios,
      topCorregimientos,
      topOcupaciones,
      porLider,
      ultimos7dias,
    });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
