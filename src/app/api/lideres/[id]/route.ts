import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const id = params.id;
    const body = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.nombre !== undefined) {
      fields.push("nombre = ?");
      values.push(body.nombre);
    }
    if (body.email !== undefined) {
      const existing = db.prepare("SELECT id FROM admins WHERE email = ? AND id != ?").get(body.email, id);
      if (existing) {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
      }
      fields.push("email = ?");
      values.push(body.email);
    }
    if (body.password) {
      fields.push("password = ?");
      values.push(bcrypt.hashSync(body.password, 10));
    }
    if (body.role !== undefined) {
      fields.push("role = ?");
      values.push(body.role === "administrador" ? "administrador" : "lider");
    }
    if (body.activo !== undefined) {
      fields.push("activo = ?");
      values.push(body.activo ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE admins SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    const data = db
      .prepare("SELECT id, email, nombre, role, activo, created_at FROM admins WHERE id = ?")
      .get(id);

    return NextResponse.json({ data, message: "Actualizado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const db = getDb();
    const id = params.id;

    if (parseInt(id) === token.userId) {
      return NextResponse.json({ error: "No puede eliminarse a sí mismo" }, { status: 400 });
    }

    db.prepare("DELETE FROM admins WHERE id = ?").run(id);
    return NextResponse.json({ message: "Eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
