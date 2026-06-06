import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }
    if (token.role !== "administrador" && token.role !== "estratega") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await request.json();
    const { estado } = body;
    if (estado !== "activa" && estado !== "cerrada" && estado !== "borrador") {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    const { rows: [existing] } = await queryWithTenant(tenant,
      "SELECT estado FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!existing) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    let queryStr = "UPDATE votaciones SET estado = $1";
    const paramsList: any[] = [estado];
    if (estado === "activa") {
      queryStr += ", fecha_inicio = COALESCE(fecha_inicio, NOW())";
    } else if (estado === "cerrada") {
      queryStr += ", fecha_fin = COALESCE(fecha_fin, NOW())";
    }
    queryStr += " WHERE id = $2 RETURNING *";
    paramsList.push(votacionId);

    const { rows: [updated] } = await queryWithTenant(tenant, queryStr, paramsList);

    return NextResponse.json({ data: updated, message: `Encuesta cambiada a ${estado}` });
  } catch (err: any) {
    console.error("[votaciones activar POST]", err?.message);
    return NextResponse.json({ error: "Error al cambiar estado" }, { status: 500 });
  }
}
