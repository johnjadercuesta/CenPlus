import { NextRequest, NextResponse } from "next/server";
import { requireDiaDLevel } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "testigo");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    // 1. Estadísticas de mesas escrutadas
    const { rows: mesasStats } = await queryWithTenant(
      tenant,
      `SELECT 
        COUNT(*)::int AS total_mesas,
        COUNT(CASE WHEN estado = 'finalizada' THEN 1 END)::int AS mesas_escrutadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)::int AS mesas_pendientes,
        COUNT(CASE WHEN testigo_id IS NOT NULL THEN 1 END)::int AS mesas_con_testigo,
        SUM(censo_mesa)::int AS censo_total
       FROM mesas_votacion`,
      []
    );

    const mStat = mesasStats[0] || { total_mesas: 0, mesas_escrutadas: 0, mesas_con_testigo: 0, censo_total: 0 };
    const pctEscrutado = mStat.total_mesas > 0 
      ? Math.round((mStat.mesas_escrutadas / mStat.total_mesas) * 100) 
      : 0;

    // 2. Votos de preconteo por candidato y corporación
    const { rows: candidatosVotos } = await queryWithTenant(
      tenant,
      `SELECT 
        c.id, c.nombre, c.corporacion, c.numero_tarjeton, c.partido,
        COALESCE(SUM(r.votos), 0)::int AS votos_preconteo,
        COUNT(r.id)::int AS actas_recibidas
       FROM corporaciones_candidatos c
       LEFT JOIN reportes_e14 r ON r.candidato_id = c.id
       WHERE c.activo = 1
       GROUP BY c.id, c.nombre, c.corporacion, c.numero_tarjeton, c.partido
       ORDER BY 
        CASE c.corporacion
          WHEN 'presidencia' THEN 1
          WHEN 'senado' THEN 2
          WHEN 'camara' THEN 3
          WHEN 'gobernacion' THEN 4
          WHEN 'asamblea' THEN 5
          WHEN 'alcaldia' THEN 6
          WHEN 'concejo' THEN 7
          ELSE 8
        END,
        votos_preconteo DESC`,
      []
    );

    // 3. Últimos reportes recibidos con foto E-14
    const { rows: ultimasActas } = await queryWithTenant(
      tenant,
      `SELECT 
        r.id, r.votos, r.foto_e14_url, r.observaciones, r.created_at,
        m.nombre_puesto, m.numero_mesa,
        c.nombre AS candidato_nombre, c.corporacion,
        u.nombre AS reportado_por_nombre
       FROM reportes_e14 r
       JOIN mesas_votacion m ON m.id = r.mesa_id
       JOIN corporaciones_candidatos c ON c.id = r.candidato_id
       LEFT JOIN admins u ON u.id = r.reportado_por
       ORDER BY r.created_at DESC
       LIMIT 15`,
      []
    );

    return NextResponse.json({
      resumen_mesas: {
        ...mStat,
        porcentaje_escrutado: pctEscrutado
      },
      resultados: candidatosVotos,
      ultimas_actas: ultimasActas
    });
  } catch (err: any) {
    console.error("[dia-d/preconteo GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
