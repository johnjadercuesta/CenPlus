import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  str = str.replace(/"/g, '""');
  if (/[",\n\r]/.test(str)) {
    return `"${str}"`;
  }
  return str;
}

function buildFilterClause(searchParams: URLSearchParams): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  const sexo = searchParams.get('sexo');
  if (sexo) { conditions.push(`c.sexo = $${params.length + 1}`); params.push(sexo); }

  const edad_min = searchParams.get('edad_min');
  if (edad_min) { conditions.push(`c.edad >= $${params.length + 1}`); params.push(parseInt(edad_min)); }

  const edad_max = searchParams.get('edad_max');
  if (edad_max) { conditions.push(`c.edad <= $${params.length + 1}`); params.push(parseInt(edad_max)); }

  const zona = searchParams.get('zona');
  if (zona) { conditions.push(`c.zona = $${params.length + 1}`); params.push(zona); }

  const comuna_id = searchParams.get('comuna_id');
  if (comuna_id) { conditions.push(`c.id_comuna = $${params.length + 1}`); params.push(parseInt(comuna_id)); }

  const barrio_id = searchParams.get('barrio_id');
  if (barrio_id) { conditions.push(`c.id_barrio = $${params.length + 1}`); params.push(parseInt(barrio_id)); }

  const nivel_estudios = searchParams.get('nivel_estudios');
  if (nivel_estudios) { conditions.push(`c.nivel_estudios = $${params.length + 1}`); params.push(nivel_estudios); }

  const regimen_salud = searchParams.get('regimen_salud');
  if (regimen_salud) { conditions.push(`c.regimen_salud = $${params.length + 1}`); params.push(regimen_salud); }

  const es_lider = searchParams.get('es_lider');
  if (es_lider === '1' || es_lider === 'true') { conditions.push(`c.es_lider = 1`); }
  if (es_lider === '0' || es_lider === 'false') { conditions.push(`(c.es_lider IS NULL OR c.es_lider = 0)`); }

  const clause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
  return { clause, params };
}

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const { clause: filterClause, params: filterParams } = buildFilterClause(searchParams);

    // Cargar encuesta
    const { rows: [encuesta] } = await queryWithTenant(tenant,
      "SELECT titulo FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    // Obtener preguntas
    const { rows: preguntas } = await queryWithTenant(tenant,
      "SELECT id, texto, tipo FROM votacion_preguntas WHERE votacion_id = $1 ORDER BY orden ASC", [votacionId]
    );

    // Obtener respuestas con filtros demográficos
    const { rows: respuestas } = await queryWithTenant(tenant,
      `SELECT r.id, r.ciudadano_id, r.sesion_id, r.user_id, r.ip_address, r.submitted_at
       FROM votacion_respuestas r
       LEFT JOIN ciudadanos c ON r.ciudadano_id = c.id_unico
       WHERE r.votacion_id = $1${filterClause}
       ORDER BY r.submitted_at ASC`,
      [votacionId, ...filterParams]
    );

    let csvLines: string[] = [];

    // Encabezados
    const headers = [
      "ID Respuesta",
      "Ciudadano ID (Cédula)",
      "Usuario ID (App)",
      "ID Sesión",
      "Dirección IP",
      "Fecha Envío"
    ];
    preguntas.forEach((preg: any) => {
      headers.push(preg.texto);
    });
    csvLines.push(headers.map(escapeCSV).join(","));

    if (respuestas.length > 0) {
      const respuestaIds = respuestas.map((r: any) => r.id);
      const { rows: items } = await queryWithTenant(tenant,
        "SELECT * FROM votacion_respuesta_items WHERE respuesta_id = ANY($1)", [respuestaIds]
      );

      const itemsMap: { [key: number]: any[] } = {};
      items.forEach((it: any) => {
        if (!itemsMap[it.respuesta_id]) itemsMap[it.respuesta_id] = [];
        itemsMap[it.respuesta_id].push(it);
      });

      respuestas.forEach((r: any) => {
        const rItems = itemsMap[r.id] || [];
        const row = [
          r.id,
          r.ciudadano_id || "",
          r.user_id || "",
          r.sesion_id || "",
          r.ip_address || "",
          new Date(r.submitted_at).toLocaleString()
        ];

        preguntas.forEach((preg: any) => {
          const item = rItems.find((it: any) => it.pregunta_id === preg.id);
          if (!item) {
            row.push("");
          } else {
            if (preg.tipo === "escala") {
              row.push(item.escala !== null && item.escala !== undefined ? String(item.escala) : "");
            } else if (preg.tipo === "opcion_multiple") {
              let optsArr: string[] = [];
              if (Array.isArray(item.opciones)) optsArr = item.opciones;
              else if (typeof item.opciones === "string") { try { optsArr = JSON.parse(item.opciones); } catch { optsArr = []; } }
              row.push(optsArr.join(" | "));
            } else {
              row.push(item.texto || "");
            }
          }
        });

        csvLines.push(row.map(escapeCSV).join(","));
      });
    }

    const csvContent = "\uFEFF" + csvLines.join("\n");
    const sanitizedTitle = encuesta.titulo.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const hasFilters = filterParams.length > 0;
    const filename = `resultados_${sanitizedTitle}${hasFilters ? '_filtrado' : ''}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error("[votaciones exportar GET]", err?.message);
    return NextResponse.json({ error: "Error al exportar resultados" }, { status: 500 });
  }
}
