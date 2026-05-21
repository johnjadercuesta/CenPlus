import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    await pool.query(`
      INSERT INTO config (clave, valor) 
      VALUES ('inteligencia_api_config', $1)
      ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
    `, [JSON.stringify(config)]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[inteligencia/scrape/config] Error:", err);
    return NextResponse.json(
      { error: "Error al guardar configuración" },
      { status: 500 }
    );
  }
}
