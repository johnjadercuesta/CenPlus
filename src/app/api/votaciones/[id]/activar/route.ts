import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireModule(request, "votaciones");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

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
