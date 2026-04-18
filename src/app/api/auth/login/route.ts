import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      "SELECT * FROM admins WHERE email = $1 AND activo = 1",
      [email]
    );
    const user = rows[0] as { id: number; email: string; password: string; nombre: string; role: string } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role as "administrador" | "estratega" | "lider",
    });

    const response = NextResponse.json({
      token,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
    });
    
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
