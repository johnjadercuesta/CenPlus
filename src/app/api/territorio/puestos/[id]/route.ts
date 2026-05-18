import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaci�n" }, { status: 403 });

    const { nombre, comunaId, votosHistoricos } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rowCount } = await run(
      "UPDATE puestos_votacion SET nombre = $1, comuna_id = $2, votos_historicos = $3 WHERE id = $4",
      [
        nombre, 
        comunaId && !isNaN(parseInt(comunaId)) ? parseInt(comunaId) : null, 
        votosHistoricos && !isNaN(parseInt(votosHistoricos)) ? parseInt(votosHistoricos) : 0, 
        params.id
      ]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });

    return NextResponse.json({ message: "Puesto de votación actualizado" });
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") return NextResponse.json({ error: "Ya existe un puesto con ese nombre" }, { status: 400 });
    return NextResponse.json({ error: `Error DB: ${err.message || 'Error desconocido'}` }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    const { rowCount } = await run("DELETE FROM puestos_votacion WHERE id = $1", [params.id]);

    if (rowCount === 0) return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });

    return NextResponse.json({ message: "Puesto de votación eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar puesto" }, { status: 500 });
  }
}
