import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant, sanitizeTenantValue } from "@/lib/tenant";

const DEMOGRAPHIC_FIELDS = [
  'sexo', 'edad', 'zona', 'id_comuna', 'id_barrio',
  'nivel_estudios', 'regimen_salud', 'es_lider', 'ocupacion'
] as const;

const RANGOS_EDAD = [
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-50', min: 36, max: 50 },
  { label: '51-65', min: 51, max: 65 },
  { label: '65+', min: 65, max: 150 },
];

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

function processPregunta(preg: any, items: any[], totalParticipantes: number) {
  const pregItems = items.filter((it: any) => it.pregunta_id === preg.id);
  const totalRespuestasPreg = pregItems.length;
  let data: any = {};

  if (preg.tipo === "seleccion_unica" || preg.tipo === "si_no") {
    const opcionesIniciales = preg.tipo === "si_no" ? ["Sí", "No"] : (preg.opciones || []);
    opcionesIniciales.forEach((opt: string) => { data[opt] = 0; });
    pregItems.forEach((it: any) => {
      const val = it.texto;
      if (val) data[val] = (data[val] || 0) + 1;
    });
  } else if (preg.tipo === "opcion_multiple") {
    const opcionesIniciales = preg.opciones || [];
    opcionesIniciales.forEach((opt: string) => { data[opt] = 0; });
    pregItems.forEach((it: any) => {
      let optsArr: string[] = [];
      if (Array.isArray(it.opciones)) optsArr = it.opciones;
      else if (typeof it.opciones === "string") { try { optsArr = JSON.parse(it.opciones); } catch { optsArr = []; } }
      if (Array.isArray(optsArr)) optsArr.forEach((opt: string) => { data[opt] = (data[opt] || 0) + 1; });
    });
  } else if (preg.tipo === "escala") {
    let suma = 0, countConEscala = 0;
    const distribucion: { [key: number]: number } = {};
    for (let i = 1; i <= 10; i++) distribucion[i] = 0;
    pregItems.forEach((it: any) => {
      if (it.escala !== null && it.escala !== undefined) {
        const esc = parseInt(it.escala);
        distribucion[esc] = (distribucion[esc] || 0) + 1;
        suma += esc; countConEscala++;
      }
    });
    data = { promedio: countConEscala > 0 ? parseFloat((suma / countConEscala).toFixed(2)) : 0, distribucion, total: countConEscala };
  } else if (preg.tipo === "texto_libre") {
    data = { respuestas: pregItems.map((it: any) => it.texto).filter(Boolean).slice(-100) };
  }

  return { id: preg.id, texto: preg.texto, tipo: preg.tipo, obligatoria: preg.obligatoria, total_respuestas: totalRespuestasPreg, data };
}

function processPreguntaConBreakdown(preg: any, items: any[], breakdownField: string, totalParticipantes: number) {
  const base = processPregunta(preg, items, totalParticipantes);

  // Get unique group values for this field
  const groupValues = [...new Set(items.map((it: any) => it[breakdown_field_to_col(breakdownField)]).filter(Boolean))].sort();

  const grupos: any = {};
  groupValues.forEach((val: any) => {
    const groupItems = items.filter((it: any) => it[breakdown_field_to_col(breakdownField)] === val);
    const grupoResult = processPregunta(preg, groupItems, totalParticipantes);
    grupos[String(val)] = {
      ...grupoResult.data,
      total_respuestas: grupoResult.total_respuestas,
    };
  });

  return { ...base, grupos };
}

function breakdown_field_to_col(field: string): string {
  const map: Record<string, string> = {
    'sexo': 'sexo',
    'edad_rango': 'edad',
    'zona': 'zona',
    'comuna': 'id_comuna',
    'barrio': 'id_barrio',
    'nivel_estudios': 'nivel_estudios',
    'regimen_salud': 'regimen_salud',
    'es_lider': 'es_lider',
    'ocupacion': 'ocupacion',
  };
  return map[field] || field;
}

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

    if (token && tokenMatchesTenant(token, request) && (token.role === "administrador" || token.role === "estratega")) {
      authOk = true;
    } else {
      if (visibilidad === "publico") {
        authOk = true;
      } else if (visibilidad === "app_users") {
        if (token && tokenMatchesTenant(token, request)) authOk = true;
      } else if (visibilidad === "ciudadanos") {
        if (token && tokenMatchesTenant(token, request)) authOk = true;
        else if (identificacion?.trim()) {
          const { rows } = await queryWithTenant(tenant,
            "SELECT id FROM ciudadanos WHERE id_unico = $1", [identificacion.trim()]
          );
          if (rows.length > 0) authOk = true;
        }
      }
    }
    if (!authOk) {
      return NextResponse.json({ error: "No tienes permiso para ver los resultados de esta encuesta" }, { status: 403 });
    }

    const breakdown_by = searchParams.get('breakdown_by') || '';
    const { clause: filterClause, params: filterParams } = buildFilterClause(searchParams);

    // Obtener total de participantes (sin filtros)
    const { rows: [{ count: totalParticipantes }] } = await queryWithTenant(tenant,
      "SELECT COUNT(*)::int AS count FROM votacion_respuestas WHERE votacion_id = $1", [votacionId]
    );

    // Obtener preguntas
    const { rows: preguntas } = await queryWithTenant(tenant,
      "SELECT * FROM votacion_preguntas WHERE votacion_id = $1 ORDER BY orden ASC", [votacionId]
    );

    // Obtener items con datos demográficos
    const itemsQuery = `
      SELECT ri.pregunta_id, ri.texto, ri.opciones, ri.escala,
             c.sexo, c.edad, c.zona, c.id_comuna, c.id_barrio,
             c.nivel_estudios, c.regimen_salud, c.es_lider, c.ocupacion
      FROM votacion_respuesta_items ri
      JOIN votacion_respuestas r ON ri.respuesta_id = r.id
      LEFT JOIN ciudadanos c ON r.ciudadano_id = c.id_unico
      WHERE r.votacion_id = $1${filterClause}
    `;
    const { rows: items } = await queryWithTenant(tenant, itemsQuery, [votacionId, ...filterParams]);

    // Obtener comunas para labels
    const { rows: comunas } = await queryWithTenant(tenant,
      "SELECT id, nombre FROM comunas ORDER BY nombre"
    );
    const comunaMap: Record<number, string> = {};
    comunas.forEach((c: any) => { comunaMap[c.id] = c.nombre; });

    // Obtener barrios para labels
    const { rows: barrios } = await queryWithTenant(tenant,
      "SELECT id, nombre FROM barrios ORDER BY nombre"
    );
    const barrioMap: Record<number, string> = {};
    barrios.forEach((b: any) => { barrioMap[b.id] = b.nombre; });

    let resultados: any[];

    if (breakdown_by && breakdown_by !== 'ninguno') {
      const col = breakdown_field_to_col(breakdown_by);
      const getLabel = (val: any): string => {
        if (val === null || val === undefined) return 'Sin dato';
        if (col === 'id_comuna') return comunaMap[val] || `Comuna #${val}`;
        if (col === 'id_barrio') return barrioMap[val] || `Barrio #${val}`;
        if (col === 'edad') {
          const r = RANGOS_EDAD.find(r => val >= r.min && val <= r.max);
          return r ? r.label : 'Otro';
        }
        if (col === 'es_lider') return val == 1 ? 'Líder' : 'No líder';
        return String(val);
      };

      resultados = preguntas.map((preg: any) => {
        const pregItems = items.filter((it: any) => it.pregunta_id === preg.id);
        const base = processPregunta(preg, items, totalParticipantes);

        // Get unique group values
        const rawValues = [...new Set(items.map((it: any) => it[col]).filter(v => v !== null && v !== undefined))].sort();
        // For edad, group into ranges
        let groupLabels: string[];
        if (col === 'edad') {
          groupLabels = RANGOS_EDAD.map(r => r.label);
        } else {
          groupLabels = rawValues.map(getLabel);
        }

        const grupos: any = {};
        const processedLabels = col === 'edad' ? RANGOS_EDAD : rawValues.map((v: any) => ({ val: v, label: getLabel(v) }));

        (processedLabels as any[]).forEach((entry: any) => {
          const label = entry.label || entry;
          let groupItems: any[];
          if (col === 'edad') {
            const r = RANGOS_EDAD.find(r => r.label === label)!;
            groupItems = pregItems.filter((it: any) => it.edad !== null && it.edad >= r.min && it.edad <= r.max);
          } else if (col === 'id_comuna') {
            const val = rawValues.find((v: any) => getLabel(v) === label);
            groupItems = pregItems.filter((it: any) => it.id_comuna === val);
          } else if (col === 'id_barrio') {
            const val = rawValues.find((v: any) => getLabel(v) === label);
            groupItems = pregItems.filter((it: any) => it.id_barrio === val);
          } else {
            const val = entry.val !== undefined ? entry.val : entry;
            groupItems = pregItems.filter((it: any) => it[col] === val);
          }
          const grupoResult = processPregunta(preg, groupItems, totalParticipantes);
          grupos[label] = { ...grupoResult.data, total_respuestas: grupoResult.total_respuestas };
        });

        return { ...base, grupos };
      });
    } else {
      resultados = preguntas.map((preg: any) => processPregunta(preg, items, totalParticipantes));
    }

    return NextResponse.json({
      data: {
        votacion_id: votacionId,
        titulo: encuesta.titulo,
        descripcion: encuesta.descripcion,
        estado: encuesta.estado,
        tipo: encuesta.tipo,
        dimensiones: encuesta.dimensiones || [],
        total_participantes: totalParticipantes,
        resultados,
        breakdown_by: breakdown_by || null,
      }
    });
  } catch (err: any) {
    console.error("[votaciones resultados GET]", err?.message);
    return NextResponse.json({ error: "Error al obtener resultados" }, { status: 500 });
  }
}
