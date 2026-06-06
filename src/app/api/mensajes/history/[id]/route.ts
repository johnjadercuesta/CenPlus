import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(
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

    const envioRes = await pool.query(
      `SELECT * FROM public.mensajes_enviados WHERE id = $1 AND tenant = $2`,
      [envioId, tenant]
    );

    if (envioRes.rows.length === 0) {
      return NextResponse.json({ error: "Envio no encontrado" }, { status: 404 });
    }

    const individualesRes = await pool.query(
      `SELECT id, ciudadano_id, ciudadano_nombre, telefono, canal, estado, error_msg, meta_msg_id, created_at
       FROM public.mensajes_individuales WHERE mensaje_id = $1 ORDER BY created_at`,
      [envioId]
    );

    return NextResponse.json({
      envio: envioRes.rows[0],
      destinatarios: individualesRes.rows,
    });
  } catch (err: any) {
    console.error("[mensajes/history/[id]] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
