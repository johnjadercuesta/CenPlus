import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();
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
    const all = searchParams.get("all") === "true";

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Líder solo ve sus registros
    if (token.role === "lider") {
      conditions.push("c.lider_id = ?");
      params.push(token.userId);
    }

    if (search) {
      conditions.push("(c.id_unico LIKE ? OR c.nombre_completo LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (nivel) {
      conditions.push("c.nivel_estudios = ?");
      params.push(nivel);
    }
    if (ocupacion) {
      conditions.push("c.ocupacion LIKE ?");
      params.push(`%${ocupacion}%`);
    }
    if (sexo) {
      conditions.push("c.sexo = ?");
      params.push(sexo);
    }
    if (barrio) {
      conditions.push("c.barrio LIKE ?");
      params.push(`%${barrio}%`);
    }
    if (corregimiento) {
      conditions.push("c.corregimiento LIKE ?");
      params.push(`%${corregimiento}%`);
    }
    if (es_lider === "true") {
      conditions.push("c.es_lider = 1");
    } else if (es_lider === "false") {
      conditions.push("c.es_lider = 0");
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countRow = db
      .prepare(`SELECT COUNT(*) as c FROM ciudadanos c ${where}`)
      .get(...params) as { c: number };
    const count = countRow.c;

    let query = `SELECT c.*, a.nombre as registrado_por FROM ciudadanos c LEFT JOIN admins a ON c.lider_id = a.id ${where} ORDER BY c.created_at DESC`;

    if (!all) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const data = db.prepare(query).all(...params);

    const mapped = (data as Record<string, unknown>[]).map((row) => ({
      ...row,
      es_lider: (row.es_lider as number) === 1,
    }));

    return NextResponse.json({
      data: mapped,
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

    const db = getDb();
    const body = await request.json();

    const requiredFields = ["id_unico", "nombre_completo", "barrio", "corregimiento"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `El campo ${field} es obligatorio` }, { status: 400 });
      }
    }

    const existing = db.prepare("SELECT id FROM ciudadanos WHERE id_unico = ?").get(String(body.id_unico).trim());
    if (existing) {
      return NextResponse.json({ error: "Esta cédula ya está registrada" }, { status: 409 });
    }

    // Líder solo puede registrar a su nombre
    const liderId = token.role === "administrador" && body.lider_id
      ? parseInt(body.lider_id)
      : token.userId;

    const stmt = db.prepare(`
      INSERT INTO ciudadanos (id_unico, nombre_completo, telefono, sexo, edad, nivel_estudios, ocupacion, barrio, corregimiento, vereda, es_lider, nombre_lider, lider_id, latitud, longitud)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      String(body.id_unico).trim(),
      String(body.nombre_completo).trim(),
      body.telefono ? String(body.telefono).trim() : null,
      body.sexo || null,
      body.edad ? parseInt(body.edad) : null,
      body.nivel_estudios || null,
      body.ocupacion ? String(body.ocupacion).trim() : null,
      String(body.barrio).trim(),
      String(body.corregimiento).trim(),
      body.vereda ? String(body.vereda).trim() : null,
      body.es_lider === true || body.es_lider === "Sí" || body.es_lider === "true" ? 1 : 0,
      body.nombre_lider ? String(body.nombre_lider).trim() : null,
      liderId,
      body.latitud ? parseFloat(body.latitud) : null,
      body.longitud ? parseFloat(body.longitud) : null
    );

    const data = db.prepare("SELECT * FROM ciudadanos WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
    data.es_lider = (data.es_lider as number) === 1;

    return NextResponse.json({ data, message: "Registro exitoso" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
