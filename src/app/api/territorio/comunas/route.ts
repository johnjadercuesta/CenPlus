import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); // 'urbana' o 'rural'

    let query = "SELECT * FROM comunas";
    const params = [];
    if (tipo) {
      query += " WHERE tipo = $1";
      params.push(tipo);
    }
    query += " ORDER BY nombre ASC";

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener comunas/corregimientos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre, tipo } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rows } = await pool.query(
      "INSERT INTO comunas (nombre, tipo) VALUES ($1, $2) ON CONFLICT (nombre) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *",
      [nombre, tipo || 'urbana']
    );

    return NextResponse.json({ data: rows[0], message: "Comuna guardada" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar comuna" }, { status: 500 });
  }
}
