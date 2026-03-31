import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();
    const data = db.prepare("SELECT * FROM sectores ORDER BY nombre").all() as Record<string, unknown>[];
    const mapped = data.map((s) => ({
      ...s,
      poligono: s.poligono ? JSON.parse(s.poligono as string) : null,
    }));

    return NextResponse.json({ data: mapped }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const { nombre, meta, latitud, longitud, radio, poligono } = await request.json();

    if (!nombre) {
      return NextResponse.json({ error: "Nombre es obligatorio" }, { status: 400 });
    }

    // Verificar si ya existe un sector con este nombre (case-insensitive)
    const existing = db.prepare("SELECT id FROM sectores WHERE nombre = ? COLLATE NOCASE").get(nombre);
    if (existing) {
      return NextResponse.json({ error: "Ya existe un sector con este nombre" }, { status: 400 });
    }

    // If polygon provided, compute centroid from it
    let lat = parseFloat(latitud) || 0;
    let lng = parseFloat(longitud) || 0;
    let polyStr = null;

    if (poligono && Array.isArray(poligono) && poligono.length >= 3) {
      polyStr = JSON.stringify(poligono);
      // Compute centroid
      lat = poligono.reduce((sum: number, p: number[]) => sum + p[0], 0) / poligono.length;
      lng = poligono.reduce((sum: number, p: number[]) => sum + p[1], 0) / poligono.length;
    }

    if (!lat || !lng) {
      return NextResponse.json({ error: "Debe proporcionar coordenadas o dibujar un polígono" }, { status: 400 });
    }

    const result = db
      .prepare("INSERT INTO sectores (nombre, meta, latitud, longitud, radio, poligono) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nombre, meta || 100, lat, lng, radio || 2000, polyStr);

    const data = db.prepare("SELECT * FROM sectores WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
    if (data.poligono) data.poligono = JSON.parse(data.poligono as string);

    return NextResponse.json({ data, message: "Sector creado" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
