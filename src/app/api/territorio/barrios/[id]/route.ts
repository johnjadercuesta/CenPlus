import { NextRequest, NextResponse } from "next/server";
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
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const { nombre, comunaId, tipo } = await request.json();
    if (!nombre || !comunaId) return NextResponse.json({ error: "Nombre y comuna obligatorios" }, { status: 400 });

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const { rowCount } = await queryWithTenant(
      tenant,
      "UPDATE barrios SET nombre = $1, comuna_id = $2, tipo = $3 WHERE id = $4",
      [nombre, parseInt(comunaId), tipo || 'barrio', params.id]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Barrio no encontrado" }, { status: 404 });

    return NextResponse.json({ message: "Barrio actualizado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar barrio" }, { status: 500 });
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
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const { rowCount } = await queryWithTenant(tenant, "DELETE FROM barrios WHERE id = $1", [params.id]);

    if (rowCount === 0) return NextResponse.json({ error: "Barrio no encontrado" }, { status: 404 });

    return NextResponse.json({ message: "Barrio eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar barrio" }, { status: 500 });
  }
}
