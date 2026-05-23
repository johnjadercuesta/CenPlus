import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

const sanitize = (t: string | null | undefined) => {
  if (!t) return null;
  const s = String(t).trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s) || s.length === 0 || s.length > 63) return null;
  return s;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado para editar sectores" }, { status: 403 });
    }

    const tenant = sanitize(token.tenant || getTenantFromRequest(request));
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    await client.query(`SET search_path TO "${tenant}", public`);

    const id = params.id;
    const body = await request.json();

    const { rows: oldRows } = await client.query("SELECT nombre FROM sectores WHERE id = $1", [id]);
    const oldSector = oldRows[0] as { nombre: string } | undefined;
    if (!oldSector) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }
    const oldNombre = oldSector.nombre;

    const fields: string[] = [];
    const values: any[] = [];
    let pCount = 1;

    if (body.nombre !== undefined) { 
      fields.push(`nombre = $${pCount++}`); 
      values.push(body.nombre); 
    }
    if (body.meta !== undefined) { 
      fields.push(`meta = $${pCount++}`); 
      values.push(parseInt(body.meta)); 
    }
    if (body.votos_historicos !== undefined) { 
      fields.push(`votos_historicos = $${pCount++}`); 
      values.push(parseInt(body.votos_historicos)); 
    }
    if (body.descripcion !== undefined) { 
      fields.push(`descripcion = $${pCount++}`); 
      values.push(body.descripcion); 
    }
    if (body.radio !== undefined) { 
      fields.push(`radio = $${pCount++}`); 
      values.push(parseFloat(body.radio)); 
    }
    if (body.activo !== undefined) { 
      fields.push(`activo = $${pCount++}`); 
      values.push(body.activo ? 1 : 0); 
    }
    if (body.color !== undefined) { 
      fields.push(`color = $${pCount++}`); 
      values.push(body.color); 
    }
    if (body.zona !== undefined) { 
        fields.push(`zona = $${pCount++}`); 
        values.push(body.zona); 
    }

    if (body.poligono !== undefined) {
      if (Array.isArray(body.poligono) && body.poligono.length >= 3) {
        fields.push(`poligono = $${pCount++}`);
        values.push(JSON.stringify(body.poligono));
        
        const lat = body.poligono.reduce((sum: number, p: number[]) => sum + p[0], 0) / body.poligono.length;
        const lng = body.poligono.reduce((sum: number, p: number[]) => sum + p[1], 0) / body.poligono.length;
        fields.push(`latitud = $${pCount++}`, `longitud = $${pCount++}`);
        values.push(lat, lng);
      }
    }

    if (body.latitud !== undefined && !body.poligono) { 
      fields.push(`latitud = $${pCount++}`); 
      values.push(parseFloat(body.latitud)); 
    }
    if (body.longitud !== undefined && !body.poligono) { 
      fields.push(`longitud = $${pCount++}`); 
      values.push(parseFloat(body.longitud)); 
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const newNombre = body.nombre;
    const isChangingName = newNombre && newNombre !== oldNombre;

    await client.query("BEGIN");
    
    values.push(id);
    const sql = `UPDATE sectores SET ${fields.join(", ")} WHERE id = $${pCount++} RETURNING *`;
    const { rows: updateRows } = await client.query(sql, values);
    
    if (isChangingName) {
      await client.query("UPDATE ciudadanos SET barrio = $1 WHERE barrio ILIKE $2", [newNombre, oldNombre]);
    }

    await client.query("COMMIT");

    const data = updateRows[0];
    if (data.poligono) data.poligono = JSON.parse(data.poligono as string);

    return NextResponse.json({ data, message: "Actualizado correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores pueden eliminar sectores" }, { status: 403 });
    }

    const tenant = sanitize(token.tenant || getTenantFromRequest(request));
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { rowCount } = await queryWithTenant(tenant, "DELETE FROM sectores WHERE id = $1", [params.id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Sector eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
