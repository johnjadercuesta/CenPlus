import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const { mesa_id, votos_candidatos, foto_e14_url, observaciones } = body;

    if (!mesa_id || !Array.isArray(votos_candidatos) || votos_candidatos.length === 0) {
      return NextResponse.json({ error: "mesa_id y lista de votos son requeridos" }, { status: 400 });
    }

    const mId = parseInt(mesa_id);
    const userId = token.userId;

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
