import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

// GET /api/votaciones — lista encuestas del tenant
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }
    if (token.role !== "administrador" && token.role !== "estratega") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const { rows } = await queryWithTenant(tenant, `
      SELECT
        v.*,
        (SELECT COUNT(*) FROM votacion_preguntas WHERE votacion_id = v.id)::int AS total_preguntas,
        (SELECT COUNT(DISTINCT vr.id) FROM votacion_respuestas vr WHERE vr.votacion_id = v.id)::int AS total_respuestas
      FROM votaciones v
      ORDER BY v.created_at DESC
    `);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("[votaciones GET]", err?.message);
    return NextResponse.json({ error: "Error al obtener encuestas" }, { status: 500 });
  }
}

// POST /api/votaciones — crear nueva encuesta
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organización" }, { status: 403 });
    }
    if (token.role !== "administrador" && token.role !== "estratega") {
      return NextResponse.json({ error: "Solo administradores y estrategas pueden crear encuestas" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const body = await request.json();
    const {
      titulo,
      descripcion,
      tipo = "encuesta",
      audiencia = "publico",
      visibilidad_resultados = "app_users",
      limite_respuestas = "una_por_sesion",
      anonima = true,
      fecha_inicio,
      fecha_fin,
      preguntas = [],
      dimensiones = [],
    } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const AUDIENCIAS_VALIDAS = ["app_users", "ciudadanos", "publico"];
    const VISIBILIDADES_VALIDAS = ["app_users", "ciudadanos", "publico"];
    const LIMITES_VALIDOS = ["una_por_sesion", "una_por_ciudadano", "multiples"];
    const TIPOS_VALIDOS = ["encuesta", "votacion", "investigacion"];

    if (!AUDIENCIAS_VALIDAS.includes(audiencia)) {
      return NextResponse.json({ error: "Audiencia no válida" }, { status: 400 });
    }
    if (!VISIBILIDADES_VALIDAS.includes(visibilidad_resultados)) {
      return NextResponse.json({ error: "Visibilidad de resultados no válida" }, { status: 400 });
    }
    if (!LIMITES_VALIDOS.includes(limite_respuestas)) {
      return NextResponse.json({ error: "Límite de respuestas no válido" }, { status: 400 });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }

    // Insertar encuesta
    const { rows: [encuesta] } = await queryWithTenant(tenant, `
      INSERT INTO votaciones (titulo, descripcion, tipo, audiencia, visibilidad_resultados, limite_respuestas, anonima, fecha_inicio, fecha_fin, creado_por, dimensiones)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      titulo.trim(),
      descripcion?.trim() || null,
      tipo,
      audiencia,
      visibilidad_resultados,
      limite_respuestas,
      anonima,
      fecha_inicio || null,
      fecha_fin || null,
      token.userId,
      Array.isArray(dimensiones) ? dimensiones : [],
    ]);

    // Insertar preguntas si vienen en el body
    if (Array.isArray(preguntas) && preguntas.length > 0) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        const TIPOS_PREGUNTA = ["seleccion_unica", "opcion_multiple", "texto_libre", "escala", "si_no"];
        if (!p.texto?.trim() || !TIPOS_PREGUNTA.includes(p.tipo)) continue;
        await queryWithTenant(tenant, `
          INSERT INTO votacion_preguntas (votacion_id, orden, texto, tipo, opciones, obligatoria)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          encuesta.id,
          i,
          p.texto.trim().slice(0, 500),
          p.tipo,
          p.opciones ? JSON.stringify(p.opciones) : null,
          p.obligatoria !== false,
        ]);
      }
    }

    return NextResponse.json({ data: encuesta, message: "Encuesta creada" }, { status: 201 });
  } catch (err: any) {
    console.error("[votaciones POST]", err?.message);
    return NextResponse.json({ error: "Error al crear encuesta" }, { status: 500 });
  }
}
