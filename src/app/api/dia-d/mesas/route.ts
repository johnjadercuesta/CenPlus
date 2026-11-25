import { NextRequest, NextResponse } from "next/server";
import { requireDiaDLevel } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";
import { normalizeDiaDLevel } from "@/lib/modules";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "testigo");
    if (auth.error) return auth.error;
    const user = auth.user;
    const level = normalizeDiaDLevel(user.dia_d_level);

    const { searchParams } = new URL(request.url);
    const puesto = searchParams.get("puesto");
    const estado = searchParams.get("estado");

    const conditions: string[] = [];
    const params: any[] = [];
    let pCount = 1;

    // Un testigo solo puede consultar las mesas que tiene asignadas.
    const soloMias =
      level === "testigo" || searchParams.get("solo_mias") === "true";

    if (soloMias) {
      conditions.push(`m.testigo_id = $${pCount++}`);
      params.push(user.userId);
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

    const { rows } = await queryWithTenant(user.tenant, sql, params);

    return NextResponse.json({ data: rows, level });
  } catch (err: any) {
    console.error("[dia-d/mesas GET] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDiaDLevel(request, "coordinador");
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { nombre_puesto, total_mesas, censo_por_mesa } = body;

    if (!nombre_puesto || !total_mesas) {
      return NextResponse.json({ error: "Nombre del puesto y total de mesas son obligatorios" }, { status: 400 });
    }

    const nMesas = parseInt(total_mesas);
    const censo = parseInt(censo_por_mesa) || 350;

    for (let m = 1; m <= nMesas; m++) {
      await queryWithTenant(
        user.tenant,
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
