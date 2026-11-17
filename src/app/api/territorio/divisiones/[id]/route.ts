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

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { nombre, tipo, zona, padre_id, codigo_divipola, latitud, longitud, poligono, activo } = body;

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;

    if (nombre !== undefined) {
      fields.push(`nombre = $${pCount++}`);
      values.push(nombre.trim());
    }
    if (tipo !== undefined) {
      fields.push(`tipo = $${pCount++}`);
      values.push(tipo);
    }
    if (zona !== undefined) {
      fields.push(`zona = $${pCount++}`);
      values.push(zona);
    }
    if (padre_id !== undefined) {
      fields.push(`padre_id = $${pCount++}`);
      values.push(padre_id ? parseInt(padre_id) : null);
    }
    if (codigo_divipola !== undefined) {
      fields.push(`codigo_divipola = $${pCount++}`);
      values.push(codigo_divipola);
    }
    if (latitud !== undefined) {
      fields.push(`latitud = $${pCount++}`);
      values.push(latitud ? parseFloat(latitud) : null);
    }
    if (longitud !== undefined) {
      fields.push(`longitud = $${pCount++}`);
      values.push(longitud ? parseFloat(longitud) : null);
    }
    if (poligono !== undefined) {
      fields.push(`poligono = $${pCount++}`);
      values.push(poligono ? (typeof poligono === "string" ? poligono : JSON.stringify(poligono)) : null);
    }
    if (activo !== undefined) {
      fields.push(`activo = $${pCount++}`);
      values.push(activo ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(id);
    const sql = `
      UPDATE division_territorial 
      SET ${fields.join(", ")} 
      WHERE id = $${pCount} 
      RETURNING *
    `;

    const { rows } = await queryWithTenant(tenant, sql, values);
    if (rows.length === 0) {
      return NextResponse.json({ error: "División territorial no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0], message: "Actualizado correctamente" });
  } catch (err: any) {
    console.error("[territorio/divisiones/[id] PUT] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar divisiones territoriales" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const id = parseInt(params.id);

    // Borrado lógico para proteger integridad referencial de ciudadanos históricos
    const { rows } = await queryWithTenant(
      tenant,
      "UPDATE division_territorial SET activo = 0 WHERE id = $1 RETURNING id",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "División territorial no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "División territorial desactivada correctamente" });
  } catch (err: any) {
    console.error("[territorio/divisiones/[id] DELETE] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
