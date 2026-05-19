import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");
    const severity = searchParams.get("severity");

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (resolved !== null) {
      conditions.push(`is_resolved = $${paramCount++}`);
      values.push(resolved === "true");
    }
    if (severity) {
      conditions.push(`severity = $${paramCount++}`);
      values.push(severity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT * FROM public.security_alerts 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT 100`,
      values
    );

    return NextResponse.json({ alerts: rows });
  } catch (err: any) {
    console.error("[alerts] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { alertId } = await request.json();

    const { rows } = await pool.query(
      `UPDATE public.security_alerts 
       SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = $1 
       WHERE id = $2 RETURNING *`,
      [token.email, alertId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ alert: rows[0], message: "Alerta resuelta" });
  } catch (err: any) {
    console.error("[alerts resolve] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
