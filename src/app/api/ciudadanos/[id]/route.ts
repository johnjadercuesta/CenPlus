import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaci�n" }, { status: 403 });

    const id = params.id;

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    // Control de Acceso: Líder solo puede editar sus propios registros
    if (token.role === "lider") {
      const { rows } = await run("SELECT lider_id FROM ciudadanos WHERE id = $1", [id]);
      const record = rows[0] as { lider_id: number } | undefined;
      if (!record || record.lider_id !== token.userId) {
        return NextResponse.json({ error: "Sin permisos para editar este registro" }, { status: 403 });
      }
    }

    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    let placeholderCount = 1;

    const setters: Record<string, (v: any) => any> = {
      nombre_completo: (v) => String(v).trim(),
      telefono: (v) => (v ? String(v).trim() : null),
      sexo: (v) => v || null,
      edad: (v) => (v ? parseInt(String(v)) : null),
      nivel_estudios: (v) => v || null,
      ocupacion: (v) => (v ? String(v).trim() : null),
      regimen_salud: (v) => v || null,
      puesto_votacion: (v) => (v ? String(v).trim() : null),
      problematica_principal: (v) => (v ? String(v).trim() : null),
      id_comuna: (v) => (v ? parseInt(String(v)) : null),
      id_barrio: (v) => (v ? parseInt(String(v)) : null),
      barrio: (v) => String(v).trim(),
      corregimiento: (v) => String(v).trim(),
      vereda: (v) => (v ? String(v).trim() : null),
      es_lider: (v) => (v === true || v === "Sí" || v === "true" || v === 1 ? 1 : 0),
      nombre_lider: (v) => (v ? String(v).trim() : null),
      latitud: (v) => (v ? parseFloat(String(v)) : null),
      longitud: (v) => (v ? parseFloat(String(v)) : null),
    };

    for (const [key, fn] of Object.entries(setters)) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${placeholderCount++}`);
        values.push(fn(body[key]));
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    // PostGIS omitido localmente
    // if (body.latitud !== undefined || body.longitud !== undefined) {
    //   const lat = body.latitud !== undefined ? setters.latitud(body.latitud) : null;
    //   const lng = body.longitud !== undefined ? setters.longitud(body.longitud) : null;
    //   
    //   if (lat !== null && lng !== null) {
    //     fields.push(`ubicacion_geom = ST_SetSRID(ST_MakePoint($${placeholderCount++}, $${placeholderCount++}), 4326)`);
    //     values.push(lng); // PostGIS usa (Longitud, Latitud)
    //     values.push(lat);
    //   }
    // }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE ciudadanos SET ${fields.join(", ")} WHERE id = $${placeholderCount} RETURNING *`;
    const { rows: updateRows } = await run(sql, values);
    const data = updateRows[0];

    if (!data) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    data.es_lider = data.es_lider === 1;

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
    if (!tokenMatchesTenant(token, request)) return NextResponse.json({ error: "Acceso no autorizado para esta organizaci�n" }, { status: 403 });

    const id = params.id;

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) => (tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params));

    // Control de Acceso: Líder solo puede eliminar sus propios registros
    if (token.role === "lider") {
      const { rows } = await run("SELECT lider_id FROM ciudadanos WHERE id = $1", [id]);
      const record = rows[0] as { lider_id: number } | undefined;
      if (!record || record.lider_id !== token.userId) {
        return NextResponse.json({ error: "Sin permisos para eliminar este registro" }, { status: 403 });
      }
    }

    const { rowCount } = await run("DELETE FROM ciudadanos WHERE id = $1", [id]);
    if (rowCount === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Registro eliminado" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
