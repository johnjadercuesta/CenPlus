import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { rows: data } = await pool.query(
      "SELECT id, email, nombre, role, activo, created_at FROM admins ORDER BY created_at DESC"
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const { email, password, nombre, role } = await request.json();

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: "Email, contraseña y nombre son obligatorios" }, { status: 400 });
    }

    const { rows: existingRows } = await pool.query("SELECT id FROM admins WHERE email = $1", [email]);
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const validRoles = ["administrador", "estratega", "lider", "analista"];
    const targetRole = validRoles.includes(role) ? role : "lider";

    const { rows } = await pool.query(
      "INSERT INTO admins (email, password, nombre, role) VALUES ($1, $2, $3, $4) RETURNING id, email, nombre, role, activo, created_at",
      [email, hash, nombre, targetRole]
    );

    return NextResponse.json({ data: rows[0], message: "Usuario creado exitosamente" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
