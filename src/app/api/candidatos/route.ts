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
    const corporacion = searchParams.get("corporacion");
    const soloActivos = searchParams.get("activos") !== "false";

    const conditions: string[] = [];
    const params: any[] = [];
    let pCount = 1;

    if (soloActivos) {
      conditions.push(`c.activo = 1`);
    }

    if (corporacion) {
      conditions.push(`c.corporacion = $${pCount++}`);
      params.push(corporacion);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT c.*,
        (SELECT COUNT(*)::int FROM apoyos_electorales a WHERE a.candidato_id = c.id) AS total_apoyos
      FROM corporaciones_candidatos c
      ${whereClause}
      ORDER BY 
        CASE c.corporacion
          WHEN 'presidencia' THEN 1
          WHEN 'senado' THEN 2
          WHEN 'camara' THEN 3
          WHEN 'gobernacion' THEN 4
          WHEN 'asamblea' THEN 5
          WHEN 'alcaldia' THEN 6
          WHEN 'concejo' THEN 7
          WHEN 'jal' THEN 8
          ELSE 9
        END,
        c.nombre ASC
    `;

    const { rows } = await queryWithTenant(tenant, sql, params);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[candidatos GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || (token.role !== "administrador" && token.role !== "estratega")) {
      return NextResponse.json({ error: "No autorizado para registrar candidatos" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, corporacion, numero_tarjeton, partido, foto_url } = body;

    if (!nombre || !corporacion) {
      return NextResponse.json({ error: "Nombre y corporación son obligatorios" }, { status: 400 });
    }

    const sql = `
      INSERT INTO corporaciones_candidatos (nombre, corporacion, numero_tarjeton, partido, foto_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      nombre.trim(),
      corporacion.toLowerCase().trim(),
      numero_tarjeton ? String(numero_tarjeton).trim() : null,
      partido ? String(partido).trim() : null,
      foto_url ? String(foto_url).trim() : null
    ];

    const { rows } = await queryWithTenant(tenant, sql, params);

    return NextResponse.json({ data: rows[0], message: "Candidato registrado correctamente" }, { status: 201 });
  } catch (err: any) {
    console.error("[candidatos POST] Error:", err.message);
    return NextResponse.json({ error: "Error al registrar candidato: " + err.message }, { status: 500 });
  }
}
