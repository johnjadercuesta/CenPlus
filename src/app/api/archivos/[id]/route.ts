import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT a.*, ad.nombre as creado_por_nombre
       FROM archivos_electorales a
       LEFT JOIN admins ad ON a.creado_por = ad.id
       WHERE a.id = $1`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ archivo: rows[0] });
  } catch (err: any) {
    console.error("[archivos] Error obteniendo archivo:", err);
    return NextResponse.json({ error: "Error al obtener archivo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await pool.query("DELETE FROM archivos_electorales WHERE id = $1 RETURNING id", [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Archivo eliminado" });
  } catch (err: any) {
    console.error("[archivos] Error eliminando archivo:", err);
    return NextResponse.json({ error: "Error al eliminar archivo" }, { status: 500 });
  }
}
