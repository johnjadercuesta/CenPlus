import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rows } = await run("SELECT * FROM puestos_votacion ORDER BY nombre ASC");
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener puestos de votación" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Token no corresponde al tenant" }, { status: 403 });

    const { nombre, comunaId, votosHistoricos } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rows } = await run(
      "INSERT INTO puestos_votacion (nombre, comuna_id, votos_historicos) VALUES ($1, $2, $3) RETURNING *",
      [
        nombre, 
        comunaId && !isNaN(parseInt(comunaId)) ? parseInt(comunaId) : null, 
        votosHistoricos && !isNaN(parseInt(votosHistoricos)) ? parseInt(votosHistoricos) : 0
      ]
    );

    return NextResponse.json({ data: rows[0], message: "Puesto guardado" }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") return NextResponse.json({ error: "Ya existe un puesto con ese nombre" }, { status: 400 });
    return NextResponse.json({ error: `Error DB: ${err.message || 'Error desconocido'}` }, { status: 500 });
  }
}
