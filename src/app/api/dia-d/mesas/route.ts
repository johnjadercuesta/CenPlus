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
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const puesto = searchParams.get("puesto");
    const estado = searchParams.get("estado");

    const conditions: string[] = [];
    const params: any[] = [];
    let pCount = 1;

    // Si el usuario es un líder/testigo, puede filtrar sus mesas asignadas
    if (token.role === "lider" && searchParams.get("solo_mias") === "true") {
      conditions.push(`m.testigo_id = $${pCount++}`);
      params.push(token.userId);
    }

    if (puesto) {
      conditions.push(`m.nombre_puesto = $${pCount++}`);
      params.push(puesto);
    }

    if (estado) {
      conditions.push(`m.estado = $${pCount++}`);
      params.push(estado);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        m.*,
        u.nombre AS testigo_nombre,
        u.email AS testigo_email,
        (SELECT COUNT(*)::int FROM reportes_e14 r WHERE r.mesa_id = m.id) AS candidatos_reportados,
        (SELECT SUM(votos)::int FROM reportes_e14 r WHERE r.mesa_id = m.id) AS total_votos_mesa
      FROM mesas_votacion m
      LEFT JOIN admins u ON u.id = m.testigo_id
      ${whereClause}
      ORDER BY m.nombre_puesto ASC, m.numero_mesa ASC
    `;

    const { rows } = await queryWithTenant(tenant, sql, params);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[dia-d/mesas GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores pueden crear mesas" }, { status: 403 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
    }

    const body = await request.json();
    const { nombre_puesto, total_mesas, censo_por_mesa } = body;

    if (!nombre_puesto || !total_mesas) {
      return NextResponse.json({ error: "Nombre del puesto y total de mesas son obligatorios" }, { status: 400 });
    }

    const nMesas = parseInt(total_mesas);
    const censo = parseInt(censo_por_mesa) || 350;

    for (let m = 1; m <= nMesas; m++) {
      await queryWithTenant(
        tenant,
        `INSERT INTO mesas_votacion (nombre_puesto, numero_mesa, censo_mesa)
         VALUES ($1, $2, $3)
         ON CONFLICT (nombre_puesto, numero_mesa) DO NOTHING`,
        [nombre_puesto.trim(), m, censo]
      );
    }

    return NextResponse.json({ message: `${nMesas} mesas registradas para ${nombre_puesto}` }, { status: 201 });
  } catch (err: any) {
    console.error("[dia-d/mesas POST] Error:", err.message);
    return NextResponse.json({ error: "Error al crear mesas: " + err.message }, { status: 500 });
  }
}
