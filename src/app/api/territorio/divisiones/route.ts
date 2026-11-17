import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const padreId = searchParams.get("padre_id");
    const tipo = searchParams.get("tipo");
    const zona = searchParams.get("zona");
    const search = searchParams.get("search");
    const soloRaices = searchParams.get("raices") === "true";

    const conditions: string[] = ["activo = 1"];
    const params: any[] = [];
    let pCount = 1;

    if (soloRaices) {
      conditions.push(`padre_id IS NULL`);
    } else if (padreId !== null) {
      if (padreId === "null" || padreId === "") {
        conditions.push(`padre_id IS NULL`);
      } else {
        conditions.push(`padre_id = $${pCount++}`);
        params.push(parseInt(padreId));
      }
    }

    if (tipo) {
      conditions.push(`tipo = $${pCount++}`);
      params.push(tipo);
    }

    if (zona) {
      conditions.push(`zona = $${pCount++}`);
      params.push(zona);
    }

    if (search) {
      conditions.push(`nombre ILIKE $${pCount++}`);
      params.push(`%${search}%`);
    }

    const sql = `
      SELECT d.*, 
        (SELECT COUNT(*)::int FROM division_territorial h WHERE h.padre_id = d.id AND h.activo = 1) AS subniveles_count,
        p.nombre AS nombre_padre
      FROM division_territorial d
      LEFT JOIN division_territorial p ON p.id = d.padre_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY d.tipo, d.nombre ASC
    `;

    const { rows } = await queryWithTenant(tenant, sql, params);

    const data = rows.map((r: any) => ({
      ...r,
      poligono: r.poligono ? (typeof r.poligono === "string" ? JSON.parse(r.poligono) : r.poligono) : null,
    }));

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("[territorio/divisiones GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado para crear divisiones territoriales" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, tipo, zona, padre_id, codigo_divipola, latitud, longitud, poligono } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: "Nombre y tipo son obligatorios" }, { status: 400 });
    }

    const polyStr = poligono ? (typeof poligono === "string" ? poligono : JSON.stringify(poligono)) : null;

    const sql = `
      INSERT INTO division_territorial (nombre, tipo, zona, padre_id, codigo_divipola, latitud, longitud, poligono)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      nombre.trim(),
      tipo,
      zona || "urbana",
      padre_id ? parseInt(padre_id) : null,
      codigo_divipola || null,
      latitud ? parseFloat(latitud) : null,
      longitud ? parseFloat(longitud) : null,
      polyStr
    ];

    const { rows } = await queryWithTenant(tenant, sql, params);
    const data = rows[0];

    return NextResponse.json({ data, message: "División territorial creada correctamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[territorio/divisiones POST] Error:", err.message);
    return NextResponse.json({ error: "Error al crear: " + err.message }, { status: 500 });
  }
}
