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

    // Cargar encuesta
    const { rows: [encuesta] } = await queryWithTenant(tenant,
      "SELECT titulo FROM votaciones WHERE id = $1", [votacionId]
    );
    if (!encuesta) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    // Obtener preguntas
    const { rows: preguntas } = await queryWithTenant(tenant,
      "SELECT id, texto, tipo FROM votacion_preguntas WHERE votacion_id = $1 ORDER BY orden ASC", [votacionId]
    );

    // Obtener respuestas
    const { rows: respuestas } = await queryWithTenant(tenant,
      "SELECT id, ciudadano_id, sesion_id, user_id, ip_address, submitted_at FROM votacion_respuestas WHERE votacion_id = $1 ORDER BY submitted_at ASC", [votacionId]
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
      // Obtener todos los items de respuestas
      const respuestaIds = respuestas.map((r: any) => r.id);
      const { rows: items } = await queryWithTenant(tenant,
        "SELECT * FROM votacion_respuesta_items WHERE respuesta_id = ANY($1)", [respuestaIds]
      );

      // Agrupar items por respuesta_id
      const itemsMap: { [key: number]: any[] } = {};
      items.forEach((it: any) => {
        if (!itemsMap[it.respuesta_id]) itemsMap[it.respuesta_id] = [];
        itemsMap[it.respuesta_id].push(it);
      });

      // Rellenar filas
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
              if (Array.isArray(item.opciones)) {
                optsArr = item.opciones;
              } else if (typeof item.opciones === "string") {
                try {
                  optsArr = JSON.parse(item.opciones);
                } catch {
                  optsArr = [];
                }
              }
              row.push(optsArr.join(" | "));
            } else {
              row.push(item.texto || "");
            }
          }
        });

        csvLines.push(row.map(escapeCSV).join(","));
      });
    }

    // Usar BOM de UTF-8 para compatibilidad con Excel en español
    const csvContent = "\uFEFF" + csvLines.join("\n");
    const sanitizedTitle = encuesta.titulo.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const filename = `resultados_${sanitizedTitle}.csv`;

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
