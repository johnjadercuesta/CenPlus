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
    const rows = db.prepare("SELECT clave, valor FROM config").all() as { clave: string; valor: string }[];
    const config: Record<string, string> = {};
    for (const r of rows) {
      config[r.clave] = r.valor;
    }

    return NextResponse.json({ config });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();

    for (const [clave, valor] of Object.entries(body)) {
      db.prepare("INSERT OR REPLACE INTO config (clave, valor) VALUES (?, ?)").run(clave, String(valor));
    }

    return NextResponse.json({ message: "Configuración actualizada" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
