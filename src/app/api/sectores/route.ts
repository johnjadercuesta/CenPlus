import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rows } = await pool.query("SELECT * FROM sectores ORDER BY nombre");
    const mapped = rows.map((s) => ({
      ...s,
      poligono: s.poligono ? JSON.parse(s.poligono as string) : null,
    }));

    return NextResponse.json({ data: mapped }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado para crear sectores" }, { status: 403 });
    }

    const { 
      nombre, 
      meta, 
      votos_historicos, 
      latitud, 
      longitud, 
      radio, 
      poligono, 
      color,
      comuna_id,
      barrio_id,
      zona
    } = await request.json();

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es obligatorio" }, { status: 400 });
    }

    // Verificar si ya existe un sector con este nombre (case-insensitive en Postgres)
    const { rows: existingRows } = await pool.query("SELECT id FROM sectores WHERE nombre ILIKE $1", [nombre]);
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Ya existe un sector con este nombre" }, { status: 400 });
    }

    let lat = latitud ? parseFloat(latitud) : 0;
    let lng = longitud ? parseFloat(longitud) : 0;
    let polyStr = null;

    if (poligono && Array.isArray(poligono) && poligono.length >= 3) {
      polyStr = JSON.stringify(poligono);
      // Calcular centroide simple si no hay coordenadas manuales
      if (!lat || !lng) {
        lat = poligono.reduce((sum: number, p: number[]) => sum + p[0], 0) / poligono.length;
        lng = poligono.reduce((sum: number, p: number[]) => sum + p[1], 0) / poligono.length;
      }
    }

    if (!lat || !lng) {
      return NextResponse.json({ error: "Debe proporcionar coordenadas o dibujar un polígono" }, { status: 400 });
    }

    const sql = `
      INSERT INTO sectores (nombre, meta, votos_historicos, latitud, longitud, radio, poligono, color, comuna_id, barrio_id, zona) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;
    const values = [
      nombre, 
      meta || 100, 
      votos_historicos || 0, 
      lat, 
      lng, 
      radio || 2000, 
      polyStr, 
      color || '#3b82f6',
      comuna_id ? parseInt(comuna_id) : null,
      barrio_id ? parseInt(barrio_id) : null,
      zona || 'urbana'
    ];
    
    const { rows } = await pool.query(sql, values);
    const data = rows[0];
    if (data.poligono) data.poligono = JSON.parse(data.poligono as string);

    return NextResponse.json({ data, message: "Sector creado" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
