import { NextRequest, NextResponse } from "next/server";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModule(request, "mensajeria");
    if (auth.error) return auth.error;
    const user = auth.user;

    const tenant = user.tenant;
    const run = (sql: string, params: any[] = []) =>
      queryWithTenant(tenant, sql, params);

    const {
      lider_ids,
      comuna_ids,
      barrio_ids,
      zona,
      sexo,
      ciudadano_id,
      ciudadano_ids,
    } = await request.json();

    const conditions: string[] = ["c.telefono IS NOT NULL AND c.telefono != ''"];
    const params: any[] = [];
    let pCount = 1;

    if (ciudadano_ids && ciudadano_ids.length > 0) {
      conditions.push(`c.id = ANY($${pCount++})`);
      params.push(ciudadano_ids);
    } else if (ciudadano_id) {
      conditions.push(`c.id = $${pCount++}`);
      params.push(ciudadano_id);
    } else {
      if (user.role === "lider") {
        conditions.push(`c.lider_id = $${pCount++}`);
        params.push(user.userId);
      }
      if (lider_ids && lider_ids.length > 0) {
        conditions.push(`c.lider_id = ANY($${pCount++})`);
        params.push(lider_ids);
      }
      if (comuna_ids && comuna_ids.length > 0) {
        conditions.push(`c.id_comuna = ANY($${pCount++})`);
        params.push(comuna_ids);
      }
      if (barrio_ids && barrio_ids.length > 0) {
        conditions.push(`c.id_barrio = ANY($${pCount++})`);
        params.push(barrio_ids);
      }
      if (zona) {
        conditions.push(`c.zona = $${pCount++}`);
        params.push(zona);
      }
      if (sexo) {
        conditions.push(`c.sexo = $${pCount++}`);
        params.push(sexo);
      }
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countRes = await run(
      `SELECT COUNT(*) as c FROM ciudadanos c ${where}`,
      params
    );
    const count = parseInt(countRes.rows[0]?.c || "0");

    const previewRes = await run(
      `SELECT c.id, c.nombre_completo, c.telefono, c.nombre_lider, c.lider_id, c.zona, c.id_comuna
       FROM ciudadanos c ${where} ORDER BY c.nombre_completo LIMIT 20`,
      params
    );

    return NextResponse.json({
      count,
      preview: previewRes.rows,
    });
  } catch (err: any) {
    console.error("[mensajes/preview] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
