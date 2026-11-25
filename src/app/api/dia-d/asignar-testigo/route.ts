import { NextRequest, NextResponse } from "next/server";
import { requireDiaDLevel } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "coordinador");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const body = await request.json();
    const { mesa_id, testigo_id } = body;

    if (!mesa_id) {
      return NextResponse.json({ error: "mesa_id es obligatorio" }, { status: 400 });
    }

    const tId = testigo_id ? parseInt(testigo_id) : null;

    const { rows } = await queryWithTenant(
      tenant,
      `UPDATE mesas_votacion 
       SET testigo_id = $1 
       WHERE id = $2 
       RETURNING *`,
      [tId, parseInt(mesa_id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0], message: "Testigo asignado correctamente" });
  } catch (err: any) {
    console.error("[dia-d/asignar-testigo POST] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
