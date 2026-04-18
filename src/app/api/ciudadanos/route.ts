import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const nivel = searchParams.get("nivel") || "";
    const ocupacion = searchParams.get("ocupacion") || "";
    const es_lider = searchParams.get("es_lider") || "";
    const sexo = searchParams.get("sexo") || "";
    const barrio = searchParams.get("barrio") || "";
    const corregimiento = searchParams.get("corregimiento") || "";
    const problematica = searchParams.get("problematica") || "";
    const all = searchParams.get("all") === "true";

    const archivoId = searchParams.get("archivo_id");

    let rows: any[] = [];
    let count = 0;

    if (archivoId) {
      const archivoRes = await pool.query(
        "SELECT snapshot FROM archivos_electorales WHERE id = $1",
        [archivoId]
      );
      if (archivoRes.rows.length === 0) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }
      let ciudadanos = archivoRes.rows[0].snapshot.ciudadanos || [];

      if (search) {
        const s = search.toLowerCase();
        ciudadanos = ciudadanos.filter(
          (c: any) =>
            c.id_unico?.toLowerCase().includes(s) ||
            c.nombre_completo?.toLowerCase().includes(s)
        );
      }
      if (nivel) {
        ciudadanos = ciudadanos.filter((c: any) => c.nivel_estudios === nivel);
      }
      if (ocupacion) {
        ciudadanos = ciudadanos.filter((c: any) => c.ocupacion?.toLowerCase().includes(ocupacion.toLowerCase()));
      }
      if (sexo) {
        ciudadanos = ciudadanos.filter((c: any) => c.sexo === sexo);
      }
      if (barrio) {
        ciudadanos = ciudadanos.filter((c: any) => c.barrio?.toLowerCase().includes(barrio.toLowerCase()));
      }
      if (corregimiento) {
        ciudadanos = ciudadanos.filter((c: any) => c.corregimiento?.toLowerCase().includes(corregimiento.toLowerCase()));
      }
      if (problematica) {
        ciudadanos = ciudadanos.filter((c: any) => c.problematica_principal === problematica);
      }
      if (es_lider === "true") {
        ciudadanos = ciudadanos.filter((c: any) => c.es_lider === 1);
      } else if (es_lider === "false") {
        ciudadanos = ciudadanos.filter((c: any) => c.es_lider === 0);
      }

      count = ciudadanos.length;
      const start = (page - 1) * limit;
      const paginated = all ? ciudadanos : ciudadanos.slice(start, start + limit);

      rows = paginated.map((c: any) => ({
        ...c,
        es_lider: c.es_lider === 1,
        registrado_por: c.registrado_por || null,
      }));
    } else {
      const conditions: string[] = [];
      const params: any[] = [];
      let pCount = 1;

      if (token.role === "lider") {
        conditions.push(`c.lider_id = $${pCount++}`);
        params.push(token.userId);
      }

      if (search) {
        conditions.push(`(c.id_unico ILIKE $${pCount} OR c.nombre_completo ILIKE $${pCount++})`);
        params.push(`%${search}%`);
      }
      if (nivel) {
        conditions.push(`c.nivel_estudios = $${pCount++}`);
        params.push(nivel);
      }
      if (ocupacion) {
        conditions.push(`c.ocupacion ILIKE $${pCount++}`);
        params.push(`%${ocupacion}%`);
      }
      if (sexo) {
        conditions.push(`c.sexo = $${pCount++}`);
        params.push(sexo);
      }
      if (barrio) {
        conditions.push(`c.barrio ILIKE $${pCount++}`);
        params.push(`%${barrio}%`);
      }
      if (corregimiento) {
        conditions.push(`c.corregimiento ILIKE $${pCount++}`);
        params.push(`%${corregimiento}%`);
      }
      if (problematica) {
        conditions.push(`c.problematica_principal = $${pCount++}`);
        params.push(problematica);
      }
      if (es_lider === "true") {
        conditions.push("c.es_lider = 1");
      } else if (es_lider === "false") {
        conditions.push("c.es_lider = 0");
      }

      const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      const countRes = await pool.query(`SELECT COUNT(*) as c FROM ciudadanos c ${where}`, params);
      count = parseInt(countRes.rows[0].c);

      let query = `SELECT c.*, a.nombre as registrado_por FROM ciudadanos c LEFT JOIN admins a ON c.lider_id = a.id ${where} ORDER BY c.created_at DESC`;

      if (!all) {
        const offset = (page - 1) * limit;
        query += ` LIMIT $${pCount++} OFFSET $${pCount++}`;
        params.push(limit, offset);
      }

      const dbResult = await pool.query(query, params);

      rows = dbResult.rows.map((row: any) => ({
        ...row,
        es_lider: row.es_lider === 1,
      }));
    }

    return NextResponse.json({
      data: rows,
      count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ["id_unico", "nombre_completo"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `El campo ${field} es obligatorio` }, { status: 400 });
      }
    }

    const { rows: existingRows } = await pool.query("SELECT id FROM ciudadanos WHERE id_unico = $1", [String(body.id_unico).trim()]);
    if (existingRows.length > 0) {
      return NextResponse.json({ error: "Esta cédula ya está registrada" }, { status: 409 });
    }

    const liderId = (token.role === "administrador" || token.role === "estratega") && body.lider_id
      ? parseInt(body.lider_id)
      : token.userId;

    const lat = body.latitud ? parseFloat(body.latitud) : null;
    const lng = body.longitud ? parseFloat(body.longitud) : null;

    const sql = `
      INSERT INTO ciudadanos (
        id_unico, nombre_completo, telefono, sexo, edad, 
        nivel_estudios, ocupacion, regimen_salud, puesto_votacion, 
        problematica_principal, id_comuna, id_barrio, barrio, 
        corregimiento, vereda, es_lider, nombre_lider, lider_id, 
        latitud, longitud, zona
      )
      VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, 
        $10, $11, $12, $13, 
        $14, $15, $16, $17, $18, 
        $19, $20, $21
      )
      RETURNING *
    `;

    const values = [
      String(body.id_unico).trim(),
      String(body.nombre_completo).trim(),
      body.telefono ? String(body.telefono).trim() : null,
      body.sexo || null,
      body.edad ? parseInt(body.edad) : null,
      body.nivel_estudios || null,
      body.ocupacion ? String(body.ocupacion).trim() : null,
      body.regimen_salud || null,
      body.puesto_votacion ? String(body.puesto_votacion).trim() : null,
      body.problematica_principal || null,
      body.id_comuna ? parseInt(body.id_comuna) : null,
      body.id_barrio ? parseInt(body.id_barrio) : null,
      String(body.barrio).trim(),
      String(body.corregimiento).trim(),
      body.vereda ? String(body.vereda).trim() : null,
      (body.es_lider === true || body.es_lider === "Sí" || body.es_lider === "true" || body.es_lider === 1) ? 1 : 0,
      body.nombre_lider ? String(body.nombre_lider).trim() : null,
      liderId,
      lat,
      lng,
      body.zona || 'urbana'
    ];

    const { rows } = await pool.query(sql, values);
    const data = rows[0];
    data.es_lider = data.es_lider === 1;

    return NextResponse.json({ data, message: "Registro exitoso" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
