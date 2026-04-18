import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const { rows } = await pool.query("SELECT * FROM problematicas_sociales ORDER BY nombre ASC");
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener problemáticas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rows } = await pool.query(
      "INSERT INTO problematicas_sociales (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING *",
      [nombre]
    );

    return NextResponse.json({ data: rows[0], message: "Problemática guardada" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar problemática" }, { status: 500 });
  }
}
