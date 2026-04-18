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

    const { nombre, tipo } = await request.json();
    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });

    const { rowCount } = await pool.query(
      "UPDATE comunas SET nombre = $1, tipo = $2 WHERE id = $3",
      [nombre, tipo || 'urbana', params.id]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Comuna no encontrada" }, { status: 404 });

    return NextResponse.json({ message: "Comuna actualizada" });
  } catch (err: any) {
    console.error(err);
    if (err.code === "23505") return NextResponse.json({ error: "Ese nombre ya está en uso por otra comuna" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar comuna" }, { status: 500 });
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

    const { rowCount } = await pool.query("DELETE FROM comunas WHERE id = $1", [params.id]);

    if (rowCount === 0) return NextResponse.json({ error: "Comuna no encontrada" }, { status: 404 });

    return NextResponse.json({ message: "Comuna eliminada (cascada aplicada)" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar comuna" }, { status: 500 });
  }
}
