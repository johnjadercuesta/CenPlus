import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const data = db
      .prepare("SELECT id, email, nombre, role, activo, created_at FROM admins ORDER BY created_at DESC")
      .all();

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const { email, password, nombre, role } = await request.json();

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: "Email, contraseña y nombre son obligatorios" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(email);
    if (existing) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare("INSERT INTO admins (email, password, nombre, role) VALUES (?, ?, ?, ?)")
      .run(email, hash, nombre, role === "administrador" ? "administrador" : "lider");

    const data = db
      .prepare("SELECT id, email, nombre, role, activo, created_at FROM admins WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json({ data, message: "Usuario creado" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
