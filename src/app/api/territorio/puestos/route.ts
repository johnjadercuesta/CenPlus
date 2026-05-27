import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Contexto no válido" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, "SELECT * FROM puestos_votacion ORDER BY nombre ASC");
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener puestos de votación" }, { status: 500 });
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

    const { nombre, comunaId, votosHistoricos } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, 
      "INSERT INTO puestos_votacion (nombre, comuna_id, votos_historicos) VALUES ($1, $2, $3) RETURNING *",
      [
        nombre, 
        comunaId && !isNaN(parseInt(comunaId)) ? parseInt(comunaId) : null, 
        votosHistoricos && !isNaN(parseInt(votosHistoricos)) ? parseInt(votosHistoricos) : 0
      ]
    );

    return NextResponse.json({ data: rows[0], message: "Puesto guardado" }, { status: 201 });
  } catch (err: any) {
    console.error("[puestos POST] Error:", err?.message || err);
    if (err.code === "23505") return NextResponse.json({ error: "Ya existe un puesto con ese nombre" }, { status: 400 });
    return NextResponse.json({ error: `Error al guardar puesto: ${err?.message || "Error interno"}` }, { status: 500 });
  }
}

