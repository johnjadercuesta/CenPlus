import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Contexto no vÃ¡lido" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); 

    let query = "SELECT * FROM comunas";
    const params = [];
    if (tipo) {
      query += " WHERE tipo = $1";
      params.push(tipo);
    }
    query += " ORDER BY nombre ASC";

    const { rows } = await queryWithTenant(tenant, query, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener comunas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== "administrador" && payload.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = payload.tenant as string;
    const { nombre, tipo } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, 
      "INSERT INTO comunas (nombre, tipo) VALUES ($1, $2) ON CONFLICT (nombre) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *",
      [nombre, tipo || 'urbana']
    );

    return NextResponse.json({ data: rows[0], message: "Comuna guardada" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar comuna" }, { status: 500 });
  }
}

