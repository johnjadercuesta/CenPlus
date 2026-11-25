import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireModule(request, "candidaturas");
    if (auth.error) return auth.error;
    const user = auth.user;

    const id = parseInt(params.id);
    const body = await request.json();
    const { nombre, corporacion, numero_tarjeton, partido, foto_url, activo } = body;

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;

    if (nombre !== undefined) {
      fields.push(`nombre = $${pCount++}`);
      values.push(nombre.trim());
    }
    if (corporacion !== undefined) {
      fields.push(`corporacion = $${pCount++}`);
      values.push(corporacion.toLowerCase().trim());
    }
    if (numero_tarjeton !== undefined) {
      fields.push(`numero_tarjeton = $${pCount++}`);
      values.push(numero_tarjeton ? String(numero_tarjeton).trim() : null);
    }
    if (partido !== undefined) {
      fields.push(`partido = $${pCount++}`);
      values.push(partido ? String(partido).trim() : null);
    }
    if (foto_url !== undefined) {
      fields.push(`foto_url = $${pCount++}`);
      values.push(foto_url ? String(foto_url).trim() : null);
    }
    if (activo !== undefined) {
      fields.push(`activo = $${pCount++}`);
      values.push(activo ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    values.push(id);
    const sql = `UPDATE corporaciones_candidatos SET ${fields.join(", ")} WHERE id = $${pCount} RETURNING *`;
    const { rows } = await queryWithTenant(user.tenant, sql, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0], message: "Candidato actualizado correctamente" });
  } catch (err: any) {
    console.error("[candidatos/[id] PUT] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireModule(request, "candidaturas");
    if (auth.error) return auth.error;
    const user = auth.user;

    const id = parseInt(params.id);
    const { rows } = await queryWithTenant(
      user.tenant,
      "UPDATE corporaciones_candidatos SET activo = 0 WHERE id = $1 RETURNING id",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Candidato desactivado correctamente" });
  } catch (err: any) {
    console.error("[candidatos/[id] DELETE] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
