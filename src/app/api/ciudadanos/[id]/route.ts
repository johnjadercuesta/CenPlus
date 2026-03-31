import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();
    const id = params.id;

    // Líder solo puede editar sus registros
    if (token.role === "lider") {
      const record = db.prepare("SELECT lider_id FROM ciudadanos WHERE id = ?").get(id) as { lider_id: number } | undefined;
      if (!record || record.lider_id !== token.userId) {
        return NextResponse.json({ error: "Sin permisos para editar este registro" }, { status: 403 });
      }
    }

    const body = await request.json();

    const fields: string[] = [];
    const values: unknown[] = [];

    const setters: Record<string, (v: unknown) => unknown> = {
      nombre_completo: (v) => String(v).trim(),
      telefono: (v) => (v ? String(v).trim() : null),
      sexo: (v) => v || null,
      edad: (v) => (v ? parseInt(String(v)) : null),
      nivel_estudios: (v) => v || null,
      ocupacion: (v) => (v ? String(v).trim() : null),
      barrio: (v) => String(v).trim(),
      corregimiento: (v) => String(v).trim(),
      vereda: (v) => (v ? String(v).trim() : null),
      es_lider: (v) => (v === true || v === "Sí" || v === "true" ? 1 : 0),
      nombre_lider: (v) => (v ? String(v).trim() : null),
      latitud: (v) => (v ? parseFloat(String(v)) : null),
      longitud: (v) => (v ? parseFloat(String(v)) : null),
    };

    for (const [key, fn] of Object.entries(setters)) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(fn(body[key]));
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE ciudadanos SET ${fields.join(", ")} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const data = db.prepare("SELECT * FROM ciudadanos WHERE id = ?").get(id) as Record<string, unknown> | undefined;

    if (!data) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    data.es_lider = (data.es_lider as number) === 1;

    return NextResponse.json({ data, message: "Actualización exitosa" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();
    const id = params.id;

    // Líder solo puede eliminar sus registros
    if (token.role === "lider") {
      const record = db.prepare("SELECT lider_id FROM ciudadanos WHERE id = ?").get(id) as { lider_id: number } | undefined;
      if (!record || record.lider_id !== token.userId) {
        return NextResponse.json({ error: "Sin permisos para eliminar este registro" }, { status: 403 });
      }
    }

    const data = db.prepare("SELECT * FROM ciudadanos WHERE id = ?").get(id);
    if (!data) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    db.prepare("DELETE FROM ciudadanos WHERE id = ?").run(id);

    return NextResponse.json({ message: "Registro eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
