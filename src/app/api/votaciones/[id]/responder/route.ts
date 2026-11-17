import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let tenant = getTenantFromRequest(request);
    if (!tenant) {
      const { searchParams } = new URL(request.url);
      tenant = sanitizeTenantValue(searchParams.get("tenant"));
    }

    if (!tenant) return NextResponse.json({ error: "Tenant no especificado o inválido" }, { status: 400 });

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    // Cargar la encuesta y sus preguntas
    const { rows: [encuesta] } = await queryWithTenant(tenant,
      "SELECT * FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    // Validar estado y fechas de la encuesta
    const now = new Date();
    if (encuesta.estado !== "activa") {
      return NextResponse.json({ error: "La encuesta no está activa" }, { status: 400 });
    }
    if (encuesta.fecha_inicio && new Date(encuesta.fecha_inicio) > now) {
      return NextResponse.json({ error: "La encuesta aún no ha comenzado" }, { status: 400 });
    }
    if (encuesta.fecha_fin && new Date(encuesta.fecha_fin) < now) {
      return NextResponse.json({ error: "La encuesta ya ha finalizado" }, { status: 400 });
    }

    const token = getTokenFromRequest(request);
    const body = await request.json();
    const { sesion_id, identificacion, respuestas } = body;

    // 1. Validar Audiencia
    if (encuesta.audiencia === "app_users") {
      if (!token) {
        return NextResponse.json({ error: "Esta encuesta es privada y requiere inicio de sesión en la aplicación" }, { status: 401 });
      }
    } else if (encuesta.audiencia === "ciudadanos") {
      if (!identificacion?.trim()) {
        return NextResponse.json({ error: "Esta encuesta requiere ingresar su número de documento (cédula)" }, { status: 400 });
      }
      const { rows: [ciudadano] } = await queryWithTenant(tenant,
        "SELECT id FROM ciudadanos WHERE id_unico = $1", [identificacion.trim()]
      );
      if (!ciudadano) {
        return NextResponse.json({ error: "El número de documento ingresado no está registrado en el sistema" }, { status: 403 });
      }
    }

    // 2. Validar Límites de Respuestas (Duplicados)
    const ipAddress = getClientIP(request);

    if (encuesta.limite_respuestas === "una_por_sesion") {
      if (!sesion_id?.trim()) {
        return NextResponse.json({ error: "Falta identificador de sesión" }, { status: 400 });
      }
      const { rows: duplicate } = await queryWithTenant(tenant,
        "SELECT id FROM votacion_respuestas WHERE votacion_id = $1 AND sesion_id = $2",
        [votacionId, sesion_id.trim()]
      );
      if (duplicate.length > 0) {
        return NextResponse.json({ error: "Ya has enviado una respuesta para esta encuesta" }, { status: 400 });
      }
    } else if (encuesta.limite_respuestas === "una_por_ciudadano") {
      if (!identificacion?.trim()) {
        return NextResponse.json({ error: "Esta encuesta requiere ingresar su número de documento para evitar respuestas duplicadas" }, { status: 400 });
      }
      // Verificar si ya respondió con esta cédula
      const { rows: duplicate } = await queryWithTenant(tenant,
        "SELECT id FROM votacion_respuestas WHERE votacion_id = $1 AND ciudadano_id = $2",
        [votacionId, identificacion.trim()]
      );
      if (duplicate.length > 0) {
        return NextResponse.json({ error: "Ya existe una respuesta registrada con este número de documento" }, { status: 400 });
      }
    }

    // Cargar preguntas para verificar obligatoriedad y tipos
    const { rows: preguntasList } = await queryWithTenant(tenant,
      "SELECT * FROM votacion_preguntas WHERE votacion_id = $1", [votacionId]
    );

    // Normalizar respuestas en un mapa de pregunta_id -> respuesta
    let answersMap: any = {};
    if (Array.isArray(respuestas)) {
      for (const item of respuestas) {
        if (item.pregunta_id !== undefined) {
          answersMap[item.pregunta_id] = item;
        }
      }
    } else if (typeof respuestas === "object" && respuestas !== null) {
      answersMap = respuestas;
    }

    // Validar obligatoriedad
    for (const preg of preguntasList) {
      const ans = answersMap[preg.id];
      const hasValue = ans && (
        (typeof ans.texto === "string" && ans.texto.trim().length > 0) ||
        (Array.isArray(ans.opciones) && ans.opciones.length > 0) ||
        (ans.escala !== undefined && ans.escala !== null)
      );

      if (preg.obligatoria && !hasValue) {
        return NextResponse.json({ error: `La pregunta "${preg.texto}" es obligatoria.` }, { status: 400 });
      }
    }

    // 3. Registrar Respuesta
    const { rows: [respRow] } = await queryWithTenant(tenant, `
      INSERT INTO votacion_respuestas (votacion_id, ciudadano_id, sesion_id, user_id, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      votacionId,
      identificacion?.trim() || null,
      sesion_id?.trim() || null,
      token?.userId || null,
      ipAddress
    ]);

    const respuestaId = respRow.id;

    // Registrar items de respuestas
    for (const preg of preguntasList) {
      const ans = answersMap[preg.id];
      if (!ans) continue;

      const textoVal = typeof ans.texto === "string" ? ans.texto.trim() : null;
      const opcionesVal = Array.isArray(ans.opciones) ? JSON.stringify(ans.opciones) : null;
      const escalaVal = ans.escala !== undefined && ans.escala !== null ? parseInt(ans.escala) : null;

      // Solo registrar si tiene algún valor
      if (textoVal !== null || opcionesVal !== null || escalaVal !== null) {
        await queryWithTenant(tenant, `
          INSERT INTO votacion_respuesta_items (respuesta_id, pregunta_id, texto, opciones, escala)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          respuestaId,
          preg.id,
          textoVal,
          opcionesVal,
          escalaVal
        ]);
      }
    }

    return NextResponse.json({ message: "Respuesta enviada con éxito", respuesta_id: respuestaId }, { status: 201 });
  } catch (err: any) {
    console.error("[votaciones responder POST]", err?.message);
    return NextResponse.json({ error: "Error al enviar la respuesta" }, { status: 500 });
  }
}
