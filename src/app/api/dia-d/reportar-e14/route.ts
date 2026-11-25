import { NextRequest, NextResponse } from "next/server";
import { requireDiaDLevel } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import { normalizeDiaDLevel } from "@/lib/modules";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "testigo");
    if (auth.error) return auth.error;
    const user = auth.user;
    const tenant = user.tenant;

    const body = await request.json();
    const { mesa_id, votos_candidatos, foto_e14_url, observaciones } = body;

    if (!mesa_id || !Array.isArray(votos_candidatos) || votos_candidatos.length === 0) {
      return NextResponse.json({ error: "mesa_id y lista de votos son requeridos" }, { status: 400 });
    }

    const mId = parseInt(mesa_id);
    const userId = user.userId;

    // Un testigo solo puede transmitir actas de sus mesas asignadas.
    if (normalizeDiaDLevel(user.dia_d_level) === "testigo") {
      const { rows: mesaRows } = await queryWithTenant(
        tenant,
        "SELECT testigo_id FROM mesas_votacion WHERE id = $1",
        [mId]
      );
      if (mesaRows.length === 0) {
        return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
      }
      if (Number(mesaRows[0].testigo_id) !== userId) {
        return NextResponse.json({ error: "No puede transmitir actas de una mesa que no le fue asignada" }, { status: 403 });
      }
    }

    // Insertar o actualizar el reporte por candidato
    for (const item of votos_candidatos) {
      const cId = parseInt(item.candidato_id);
      const v = parseInt(item.votos) || 0;
      if (isNaN(cId)) continue;

      await queryWithTenant(
        tenant,
        `INSERT INTO reportes_e14 (mesa_id, candidato_id, votos, foto_e14_url, observaciones, reportado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mesa_id, candidato_id) 
         DO UPDATE SET votos = EXCLUDED.votos, foto_e14_url = COALESCE(EXCLUDED.foto_e14_url, reportes_e14.foto_e14_url),
                       observaciones = EXCLUDED.observaciones, reportado_por = EXCLUDED.reportado_por`,
        [mId, cId, v, foto_e14_url || null, observaciones || null, userId]
      );
    }

    // Actualizar estado de la mesa a 'finalizada'
    await queryWithTenant(
      tenant,
      "UPDATE mesas_votacion SET estado = 'finalizada' WHERE id = $1",
      [mId]
    );

    return NextResponse.json({ message: "Acta E-14 transmitida y procesada correctamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[dia-d/reportar-e14 POST] Error:", err.message);
    return NextResponse.json({ error: "Error al reportar acta E-14: " + err.message }, { status: 500 });
  }
}
