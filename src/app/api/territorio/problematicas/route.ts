import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Contexto no válido" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, "SELECT * FROM problematicas_sociales ORDER BY nombre ASC");
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener problemáticas" }, { status: 500 });
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

    const { nombre } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, 
      "INSERT INTO problematicas_sociales (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING *",
      [nombre]
    );

    return NextResponse.json({ data: rows[0], message: "Problemática guardada" }, { status: 201 });
  } catch (err: any) {
    console.error("[problematicas POST] Error:", err?.message || err);
    return NextResponse.json({ error: `Error al guardar problemática: ${err?.message || "Error interno"}` }, { status: 500 });
  }
}

