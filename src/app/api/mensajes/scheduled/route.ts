import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no detectado" }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT id, canal, modo, mensaje, destinatarios_count, programado_para, created_at
       FROM public.mensajes_enviados
       WHERE tenant = $1 AND estado = 'pendiente' AND programado_para IS NOT NULL AND programado_para > NOW()
       ORDER BY programado_para ASC`,
      [tenant]
    );

    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error("[mensajes/scheduled] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE public.mensajes_enviados SET estado = 'cancelado' WHERE id = $1 AND tenant = $2 AND estado = 'pendiente' RETURNING id`,
      [id, tenant]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Envio no encontrado o ya no esta pendiente" }, { status: 404 });
    }

    return NextResponse.json({ message: "Envio cancelado correctamente" });
  } catch (err: any) {
    console.error("[mensajes/scheduled] DELETE Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
