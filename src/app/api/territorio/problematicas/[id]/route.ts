import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rowCount } = await pool.query(
      "UPDATE problematicas_sociales SET nombre = $1 WHERE id = $2",
      [nombre, params.id]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Problemática no encontrada" }, { status: 404 });

    return NextResponse.json({ message: "Problemática social actualizada" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar problemática" }, { status: 500 });
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

    const { rowCount } = await pool.query("DELETE FROM problematicas_sociales WHERE id = $1", [params.id]);

    if (rowCount === 0) return NextResponse.json({ error: "Problemática no encontrada" }, { status: 404 });

    return NextResponse.json({ message: "Problemática social eliminada" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar problemática" }, { status: 500 });
  }
}
