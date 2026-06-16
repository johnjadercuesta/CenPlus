import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";
import { pool } from "@/lib/db";

async function resolveTenantFromVotacionId(id: number): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      "SELECT table_schema FROM information_schema.tables WHERE table_name = 'votaciones' AND table_schema NOT IN ('public', 'information_schema', 'pg_catalog')"
    );
    for (const row of rows) {
      const schema = row.table_schema;
      const { rows: found } = await pool.query(
        `SELECT 1 FROM "${schema}".votaciones WHERE id = $1 LIMIT 1`, [id]
      );
      if (found.length > 0) return schema;
    }
  } catch {}
  return null;
}

// GET /api/votaciones/[id] — detalle de una encuesta con preguntas
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (token && !tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    let tenant = getTenantFromRequest(request);
    if (!tenant) {
      const { searchParams } = new URL(request.url);
      tenant = sanitizeTenantValue(searchParams.get("tenant"));
    }

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    if (!tenant) {
      // Fallback: buscar el tenant automáticamente por el ID de votación
      tenant = await resolveTenantFromVotacionId(votacionId);
    }

    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const { rows: [encuesta] } = await queryWithTenant(tenant,
      "SELECT id, titulo, descripcion, estado, tipo, audiencia, visibilidad_resultados, limite_respuestas, anonima, fecha_inicio, fecha_fin, created_at, dimensiones FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    // Si no está autenticado, solo permitir ver si está activa/cerrada y la audiencia es pública o ciudadanos
    if (!token) {
      if (encuesta.estado === "borrador") {
        return NextResponse.json({ error: "Esta encuesta aún no ha sido publicada" }, { status: 401 });
      }
      if (encuesta.audiencia === "app_users") {
        return NextResponse.json({ error: "Esta encuesta requiere inicio de sesión en la aplicación" }, { status: 401 });
      }
    }

    const { rows: preguntas } = await queryWithTenant(tenant,
      "SELECT id, orden, texto, tipo, opciones, obligatoria FROM votacion_preguntas WHERE votacion_id = $1 ORDER BY orden ASC", [votacionId]
    );

    const { rows: [{ count: totalRespuestas }] } = await queryWithTenant(tenant,
      "SELECT COUNT(*)::int AS count FROM votacion_respuestas WHERE votacion_id = $1", [votacionId]
    );

    return NextResponse.json({
      data: { ...encuesta, preguntas, total_respuestas: totalRespuestas }
    });
  } catch (err: any) {
    console.error("[votaciones GET id]", err?.message);
    return NextResponse.json({ error: "Error al obtener encuesta" }, { status: 500 });
  }
}

// PUT /api/votaciones/[id] — editar encuesta (solo si está en borrador)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }
    if (token.role !== "administrador" && token.role !== "estratega") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    // Verificar que existe y está en borrador
    const { rows: [existing] } = await queryWithTenant(tenant,
      "SELECT estado FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!existing) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    if (existing.estado !== "borrador") {
      return NextResponse.json({ error: "Solo se pueden editar encuestas en estado borrador" }, { status: 400 });
    }

    const body = await request.json();
    const {
      titulo, descripcion, tipo, audiencia,
      visibilidad_resultados, limite_respuestas,
      anonima, fecha_inicio, fecha_fin,
      preguntas, dimensiones,
    } = body;

    // Actualizar encuesta
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (titulo !== undefined) { updates.push(`titulo = $${idx++}`); values.push(titulo.trim()); }
    if (descripcion !== undefined) { updates.push(`descripcion = $${idx++}`); values.push(descripcion?.trim() || null); }
    if (tipo !== undefined) { updates.push(`tipo = $${idx++}`); values.push(tipo); }
    if (audiencia !== undefined) { updates.push(`audiencia = $${idx++}`); values.push(audiencia); }
    if (visibilidad_resultados !== undefined) { updates.push(`visibilidad_resultados = $${idx++}`); values.push(visibilidad_resultados); }
    if (limite_respuestas !== undefined) { updates.push(`limite_respuestas = $${idx++}`); values.push(limite_respuestas); }
    if (anonima !== undefined) { updates.push(`anonima = $${idx++}`); values.push(anonima); }
    if (fecha_inicio !== undefined) { updates.push(`fecha_inicio = $${idx++}`); values.push(fecha_inicio || null); }
    if (fecha_fin !== undefined) { updates.push(`fecha_fin = $${idx++}`); values.push(fecha_fin || null); }
    if (dimensiones !== undefined) { updates.push(`dimensiones = $${idx++}`); values.push(Array.isArray(dimensiones) ? dimensiones : []); }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(votacionId);
      await queryWithTenant(tenant,
        `UPDATE votaciones SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      );
    }

    // Reemplazar preguntas si vienen
    if (Array.isArray(preguntas)) {
      await queryWithTenant(tenant, "DELETE FROM votacion_preguntas WHERE votacion_id = $1", [votacionId]);
      const TIPOS_PREGUNTA = ["seleccion_unica", "opcion_multiple", "texto_libre", "escala", "si_no"];
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        if (!p.texto?.trim() || !TIPOS_PREGUNTA.includes(p.tipo)) continue;
        await queryWithTenant(tenant, `
          INSERT INTO votacion_preguntas (votacion_id, orden, texto, tipo, opciones, obligatoria)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [votacionId, i, p.texto.trim().slice(0, 500), p.tipo, p.opciones ? JSON.stringify(p.opciones) : null, p.obligatoria !== false]);
      }
    }

    return NextResponse.json({ message: "Encuesta actualizada" });
  } catch (err: any) {
    console.error("[votaciones PUT]", err?.message);
    return NextResponse.json({ error: "Error al actualizar encuesta" }, { status: 500 });
  }
}

// DELETE /api/votaciones/[id] — eliminar encuesta (solo borrador)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }
    if (token.role !== "administrador" && token.role !== "estratega") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { rows: [existing] } = await queryWithTenant(tenant,
      "SELECT estado FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!existing) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    if (existing.estado !== "borrador") {
      return NextResponse.json({ error: "Solo se pueden eliminar encuestas en estado borrador" }, { status: 400 });
    }

    await queryWithTenant(tenant, "DELETE FROM votaciones WHERE id = $1", [votacionId]);

    return NextResponse.json({ message: "Encuesta eliminada" });
  } catch (err: any) {
    console.error("[votaciones DELETE]", err?.message);
    return NextResponse.json({ error: "Error al eliminar encuesta" }, { status: 500 });
  }
}
