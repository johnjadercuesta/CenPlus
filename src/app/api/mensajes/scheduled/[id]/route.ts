import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    const envioId = params.id;

    const res = await pool.query(
      `UPDATE public.mensajes_enviados SET estado = 'cancelado'
       WHERE id = $1 AND tenant = $2 AND estado = 'pendiente' AND programado_para IS NOT NULL
       RETURNING id`,
      [envioId, tenant]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Envio no encontrado o ya no esta pendiente" }, { status: 404 });
    }

    return NextResponse.json({ message: "Envio programado cancelado correctamente" });
  } catch (err: any) {
    console.error("[mensajes/scheduled/[id]] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
