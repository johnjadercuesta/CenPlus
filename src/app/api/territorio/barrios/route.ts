import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Contexto no válido" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const comunaId = searchParams.get("comunaId");
    const tipo = searchParams.get("tipo");

    let query = "SELECT * FROM barrios";
    const params = [];
    let whereClauses = [];
    if (comunaId) {
      params.push(comunaId);
      whereClauses.push("comuna_id = $" + params.length);
    }
    if (tipo) {
      params.push(tipo);
      whereClauses.push("tipo = $" + params.length);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " ORDER BY nombre ASC";

    const { rows } = await queryWithTenant(tenant, query, params);
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener barrios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload || (payload.role !== "administrador" && payload.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = payload.tenant as string;
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const { nombre, comunaId, tipo } = await request.json();
    if (!nombre || !comunaId) return NextResponse.json({ error: "Nombre y comuna obligatorios" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant,
      "INSERT INTO barrios (nombre, comuna_id, tipo) VALUES ($1, $2, $3) ON CONFLICT (nombre, comuna_id) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *",
      [nombre, parseInt(comunaId), tipo || 'barrio']
    );

    return NextResponse.json({ data: rows[0], message: "Barrio guardado" }, { status: 201 });
  } catch (err: any) {
    console.error("[barrios POST] Error:", err?.message || err);
    return NextResponse.json({ error: `Error al guardar barrio: ${err?.message || "Error interno"}` }, { status: 500 });
  }
}

