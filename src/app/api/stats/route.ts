import { NextRequest, NextResponse } from "next/server";
import { requireAnyModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAnyModule(request, [
      "dashboard",
      "registros",
      "mapa",
      "archivos",
      "inteligencia",
      "mi-panel",
      "escala",
    ]);
    if (auth.error) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const archivoId = searchParams.get("archivo_id");

    let total, lideres, conCoords, hoy, semana, porEstudios, porSexo, topBarrios, topCorregimientos, topOcupaciones, topRegimenSalud, topProblematicas, porLider, rows7dias: { fecha: string; c: number }[], avgEdad;

    const tenant = user.tenant;
    const run = (sql: string, params: any[] = []) => queryWithTenant(tenant, sql, params);

    if (archivoId) {
      const archivoRes = await run(
        "SELECT snapshot FROM archivos_electorales WHERE id = $1",
        [archivoId]
      );
      if (archivoRes.rows.length === 0) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }
      const rawSnapshot = archivoRes.rows[0].snapshot;
      const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
      const ciudadanos = snapshot.ciudadanos || [];

      total = ciudadanos.length;
      lideres = ciudadanos.filter((c: any) => c.es_lider === 1).length;
      conCoords = ciudadanos.filter((c: any) => c.latitud != null && c.longitud != null).length;
      hoy = 0;
      semana = 0;

      const estudiosMap: Record<string, number> = {};
      const sexoMap: Record<string, number> = {};
      const barrioMap: Record<string, number> = {};
      const corrMap: Record<string, number> = {};
      const ocupMap: Record<string, number> = {};
      const saludMap: Record<string, number> = {};
      const probMap: Record<string, number> = {};
      let totalEdad = 0;
      let countEdad = 0;

      for (const c of ciudadanos) {
        if (c.nivel_estudios) estudiosMap[c.nivel_estudios] = (estudiosMap[c.nivel_estudios] || 0) + 1;
        if (c.sexo) sexoMap[c.sexo] = (sexoMap[c.sexo] || 0) + 1;
        if (c.barrio) barrioMap[c.barrio] = (barrioMap[c.barrio] || 0) + 1;
        if (c.corregimiento) corrMap[c.corregimiento] = (corrMap[c.corregimiento] || 0) + 1;
        if (c.ocupacion) ocupMap[c.ocupacion] = (ocupMap[c.ocupacion] || 0) + 1;
        if (c.regimen_salud) saludMap[c.regimen_salud] = (saludMap[c.regimen_salud] || 0) + 1;
        if (c.problematica_principal) probMap[c.problematica_principal] = (probMap[c.problematica_principal] || 0) + 1;
        if (c.edad) { totalEdad += c.edad; countEdad++; }
      }

      porEstudios = Object.entries(estudiosMap).map(([nivel_estudios, c]) => ({ nivel_estudios, c })).sort((a, b) => (b.c as number) - (a.c as number));
      porSexo = Object.entries(sexoMap).map(([sexo, c]) => ({ sexo, c }));
      topBarrios = Object.entries(barrioMap).map(([barrio, c]) => ({ barrio, c })).sort((a, b) => (b.c as number) - (a.c as number)).slice(0, 10);
      topCorregimientos = Object.entries(corrMap).map(([corregimiento, c]) => ({ corregimiento, c })).sort((a, b) => (b.c as number) - (a.c as number)).slice(0, 10);
      topOcupaciones = Object.entries(ocupMap).map(([ocupacion, c]) => ({ ocupacion, c })).sort((a, b) => (b.c as number) - (a.c as number)).slice(0, 10);
      topRegimenSalud = Object.entries(saludMap).map(([regimen_salud, c]) => ({ regimen_salud, c })).sort((a, b) => (b.c as number) - (a.c as number));
      topProblematicas = Object.entries(probMap).map(([problematica, c]) => ({ problematica, c })).sort((a, b) => (b.c as number) - (a.c as number));
      porLider = [];
      // Populate rows7dias with 7 empty days for the chart
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const today = new Date().getDay();
      rows7dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        rows7dias.push({
          fecha: d.toLocaleDateString("es-CO", { weekday: "short" }),
          c: 0
        });
      }
      avgEdad = countEdad > 0 ? Math.round(totalEdad / countEdad) : 0;
    } else {
      const totalRes = await run("SELECT COUNT(*) as c FROM ciudadanos");
      total = parseInt(totalRes.rows[0].c);

      const lideresRes = await run("SELECT COUNT(*) as c FROM ciudadanos WHERE es_lider = 1");
      lideres = parseInt(lideresRes.rows[0].c);

      const conCoordsRes = await run("SELECT COUNT(*) as c FROM ciudadanos WHERE latitud IS NOT NULL");
      conCoords = parseInt(conCoordsRes.rows[0].c);

      const hoyRes = await run("SELECT COUNT(*) as c FROM ciudadanos WHERE created_at::date = CURRENT_DATE");
      hoy = parseInt(hoyRes.rows[0].c);

      const semanaRes = await run("SELECT COUNT(*) as c FROM ciudadanos WHERE created_at >= NOW() - INTERVAL '7 days'");
      semana = parseInt(semanaRes.rows[0].c);

      const { rows: porEstudiosRows } = await run(
        "SELECT nivel_estudios, COUNT(*) as c FROM ciudadanos WHERE nivel_estudios IS NOT NULL GROUP BY nivel_estudios ORDER BY c DESC"
      );
      porEstudios = porEstudiosRows;

      const { rows: porSexoRows } = await run(
        "SELECT sexo, COUNT(*) as c FROM ciudadanos WHERE sexo IS NOT NULL GROUP BY sexo"
      );
      porSexo = porSexoRows;

      const { rows: topBarriosRows } = await run(
        "SELECT barrio, COUNT(*) as c FROM ciudadanos GROUP BY barrio ORDER BY c DESC LIMIT 10"
      );
      topBarrios = topBarriosRows;

      const { rows: topCorregimientosRows } = await run(
        "SELECT corregimiento, COUNT(*) as c FROM ciudadanos GROUP BY corregimiento ORDER BY c DESC LIMIT 10"
      );
      topCorregimientos = topCorregimientosRows;

      const { rows: topOcupacionesRows } = await run(
        "SELECT ocupacion, COUNT(*) as c FROM ciudadanos WHERE ocupacion IS NOT NULL AND ocupacion != '' GROUP BY ocupacion ORDER BY c DESC LIMIT 10"
      );
      topOcupaciones = topOcupacionesRows;

      const { rows: topRegimenSaludRows } = await run(
        "SELECT regimen_salud, COUNT(*) as c FROM ciudadanos WHERE regimen_salud IS NOT NULL GROUP BY regimen_salud ORDER BY c DESC"
      );
      topRegimenSalud = topRegimenSaludRows;

      const { rows: topProblematicasRows } = await run(
        "SELECT problematica_principal as problematica, COUNT(*) as c FROM ciudadanos WHERE problematica_principal IS NOT NULL GROUP BY problematica_principal ORDER BY c DESC"
      );
      topProblematicas = topProblematicasRows;

      const { rows: porLiderRows } = await run(`
        SELECT COALESCE(a.nombre, 'Sin Asignar') as nombre, COUNT(c.id) as c
        FROM ciudadanos c
        LEFT JOIN admins a ON c.lider_id = a.id
        GROUP BY a.nombre
        ORDER BY c DESC
      `);
      porLider = porLiderRows;

      const { rows: rows7diasResult } = await run(`
        SELECT d::date as fecha, COUNT(c.id) as c
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
        LEFT JOIN ciudadanos c ON c.created_at::date = d::date
        GROUP BY d::date
        ORDER BY d::date ASC
      `);
      rows7dias = rows7diasResult.map((r: any) => ({
        fecha: new Date(r.fecha).toLocaleDateString("es-CO", { weekday: "short" }),
        c: parseInt(r.c)
      }));

      const { rows: avgRes } = await run("SELECT AVG(edad) as avg FROM ciudadanos WHERE edad IS NOT NULL");
      avgEdad = avgRes[0].avg ? Math.round(parseFloat(avgRes[0].avg)) : 0;
    }
    const { rows: configRows } = await run("SELECT valor FROM config WHERE clave = 'meta_global'");
    const meta = configRows.length > 0 ? parseInt(configRows[0].valor) : 1000;
    const porcentajeMeta = Math.round((total / meta) * 1000) / 10;

    const response = NextResponse.json({
      total,
      lideres,
      conCoords,
      hoy,
      semana,
      meta,
      porcentajeMeta,
      avgEdad,
      porEstudios,
      porSexo,
      topBarrios,
      topCorregimientos,
      topOcupaciones,
      topRegimenSalud,
      topProblematicas,
      porLider,
      ultimos7dias: rows7dias,
    });
    
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
