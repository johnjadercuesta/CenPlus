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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const canal = searchParams.get("canal") || "";
    const estado = searchParams.get("estado") || "";

    const conditions: string[] = ["tenant = $1"];
    const params: any[] = [tenant];
    let pCount = 2;

    if (canal) {
      conditions.push(`canal = $${pCount++}`);
      params.push(canal);
    }
    if (estado) {
      conditions.push(`estado = $${pCount++}`);
      params.push(estado);
    }

    const where = "WHERE " + conditions.join(" AND ");

    const countRes = await pool.query(
      `SELECT COUNT(*) as c FROM public.mensajes_enviados ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.c || "0");

    const offset = (page - 1) * limit;
    const historyRes = await pool.query(
      `SELECT id, canal, modo, mensaje, destinatarios_count, exitosos_count, fallidos_count,
              filtros, programado_para, enviado_en, estado, enviado_por, created_at
       FROM public.mensajes_enviados ${where}
       ORDER BY created_at DESC LIMIT $${pCount++} OFFSET $${pCount++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: historyRes.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[mensajes/history] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
