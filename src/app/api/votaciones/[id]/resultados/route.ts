import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let tenant = getTenantFromRequest(request);
    if (!tenant) {
      const { searchParams } = new URL(request.url);
      tenant = sanitizeTenantValue(searchParams.get("tenant"));
    }
    if (!tenant) return NextResponse.json({ error: "Tenant no especificado" }, { status: 400 });

    const votacionId = parseInt(params.id);
    if (isNaN(votacionId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    // Cargar encuesta
    const { rows: [encuesta] } = await queryWithTenant(tenant,
      "SELECT * FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    // Validar visibilidad de resultados
    const token = getTokenFromRequest(request);
    const { searchParams } = new URL(request.url);
    const identificacion = searchParams.get("identificacion");

    const visibilidad = encuesta.visibilidad_resultados || "app_users";

    let authOk = false;

    // Si el usuario es administrador o estratega del tenant, siempre tiene permiso
    if (token && tokenMatchesTenant(token, request) && (token.role === "administrador" || token.role === "estratega")) {
      authOk = true;
    } else {
      if (visibilidad === "publico") {
        authOk = true;
      } else if (visibilidad === "app_users") {
        if (token && tokenMatchesTenant(token, request)) {
          authOk = true;
        }
      } else if (visibilidad === "ciudadanos") {
        if (token && tokenMatchesTenant(token, request)) {
          authOk = true;
        } else if (identificacion?.trim()) {
          // Verificar si es un ciudadano registrado
          const { rows } = await queryWithTenant(tenant,
            "SELECT id FROM ciudadanos WHERE id_unico = $1", [identificacion.trim()]
          );
          if (rows.length > 0) {
            authOk = true;
          }
        }
      }
    }

    if (!authOk) {
      return NextResponse.json({ error: "No tienes permiso para ver los resultados de esta encuesta" }, { status: 403 });
    }

    // 1. Obtener total de participantes
    const { rows: [{ count: totalParticipantes }] } = await queryWithTenant(tenant,
      "SELECT COUNT(*)::int AS count FROM votacion_respuestas WHERE votacion_id = $1", [votacionId]
    );

    // 2. Obtener preguntas
    const { rows: preguntas } = await queryWithTenant(tenant,
      "SELECT * FROM votacion_preguntas WHERE votacion_id = $1 ORDER BY orden ASC", [votacionId]
    );

    // 3. Obtener todas las respuestas a preguntas para esta encuesta
    const { rows: items } = await queryWithTenant(tenant, `
      SELECT ri.pregunta_id, ri.texto, ri.opciones, ri.escala
      FROM votacion_respuesta_items ri
      JOIN votacion_respuestas r ON ri.respuesta_id = r.id
      WHERE r.votacion_id = $1
    `, [votacionId]);

    // Procesar resultados
    const resultados = preguntas.map((preg: any) => {
      const pregItems = items.filter((it: any) => it.pregunta_id === preg.id);
      const totalRespuestasPreg = pregItems.length;

      let data: any = {};

      if (preg.tipo === "seleccion_unica" || preg.tipo === "si_no") {
        // Inicializar opciones conocidas con 0
        const opcionesIniciales = preg.tipo === "si_no" ? ["Sí", "No"] : (preg.opciones || []);
        opcionesIniciales.forEach((opt: string) => {
          data[opt] = 0;
        });

        pregItems.forEach((it: any) => {
          const val = it.texto;
          if (val) {
            data[val] = (data[val] || 0) + 1;
          }
        });
      } else if (preg.tipo === "opcion_multiple") {
        // Inicializar opciones conocidas
        const opcionesIniciales = preg.opciones || [];
        opcionesIniciales.forEach((opt: string) => {
          data[opt] = 0;
        });

        pregItems.forEach((it: any) => {
          let optsArr: string[] = [];
          if (Array.isArray(it.opciones)) {
            optsArr = it.opciones;
          } else if (typeof it.opciones === "string") {
            try {
              optsArr = JSON.parse(it.opciones);
            } catch {
              optsArr = [];
            }
          }
          if (Array.isArray(optsArr)) {
            optsArr.forEach((opt: string) => {
              data[opt] = (data[opt] || 0) + 1;
            });
          }
        });
      } else if (preg.tipo === "escala") {
        let suma = 0;
        let countConEscala = 0;
        const distribucion: { [key: number]: number } = {};

        // Inicializar 1 a 10 (o 1 a 5 si se quiere)
        for (let i = 1; i <= 10; i++) distribucion[i] = 0;

        pregItems.forEach((it: any) => {
          if (it.escala !== null && it.escala !== undefined) {
            const esc = parseInt(it.escala);
            distribucion[esc] = (distribucion[esc] || 0) + 1;
            suma += esc;
            countConEscala++;
          }
        });

        data = {
          promedio: countConEscala > 0 ? parseFloat((suma / countConEscala).toFixed(2)) : 0,
          distribucion,
          total: countConEscala
        };
      } else if (preg.tipo === "texto_libre") {
        data = {
          respuestas: pregItems.map((it: any) => it.texto).filter(Boolean).slice(-100) // últimos 100
        };
      }

      return {
        id: preg.id,
        texto: preg.texto,
        tipo: preg.tipo,
        obligatoria: preg.obligatoria,
        total_respuestas: totalRespuestasPreg,
        data
      };
    });

    return NextResponse.json({
      data: {
        votacion_id: votacionId,
        titulo: encuesta.titulo,
        descripcion: encuesta.descripcion,
        estado: encuesta.estado,
        tipo: encuesta.tipo,
        total_participantes: totalParticipantes,
        resultados
      }
    });
  } catch (err: any) {
    console.error("[votaciones resultados GET]", err?.message);
    return NextResponse.json({ error: "Error al obtener resultados" }, { status: 500 });
  }
}
