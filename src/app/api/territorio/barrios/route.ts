import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comunaId = searchParams.get("comunaId");

    const tipo = searchParams.get("tipo"); // 'barrio' o 'vereda'
 
    let query = "SELECT * FROM barrios";
    const params = [];
    let whereClauses = [];
    if (comunaId) {
      params.push(comunaId);
      whereClauses.push("comuna_id = $" + params.length);
    }
    if (tipo) {
      params.push(tipo);
      whereClauses.push("tipo = $" + params.length);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " ORDER BY nombre ASC";

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener barrios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre, comunaId, tipo } = await request.json();
    if (!nombre || !comunaId) return NextResponse.json({ error: "Nombre y comunaId obligatorios" }, { status: 400 });

    const { rows } = await pool.query(
      "INSERT INTO barrios (nombre, comuna_id, tipo) VALUES ($1, $2, $3) ON CONFLICT (nombre, comuna_id) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *",
      [nombre, parseInt(comunaId), tipo || 'barrio']
    );

    return NextResponse.json({ data: rows[0], message: "Barrio guardado" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar barrio" }, { status: 500 });
  }
}
