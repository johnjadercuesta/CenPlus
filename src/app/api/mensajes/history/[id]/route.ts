import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireModule(request, "mensajeria");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;
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
