import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rows } = await pool.query("SELECT clave, valor FROM config");
    const config: Record<string, string> = {};
    for (const r of rows) {
      config[r.clave] = r.valor;
    }

    return NextResponse.json({ config });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores pueden cambiar la configuración" }, { status: 403 });
    }

    const body = await request.json();

    for (const [clave, valor] of Object.entries(body)) {
      await pool.query(
        "INSERT INTO config (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = $2",
        [clave, String(valor)]
      );
    }

    return NextResponse.json({ message: "Configuración actualizada correctamente" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
