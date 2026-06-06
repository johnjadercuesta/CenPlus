import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest, tokenMatchesTenant } from "@/lib/auth";
import { getTenantFromRequest, queryWithTenant } from "@/lib/tenant";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-meta";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!tokenMatchesTenant(token, request)) {
      return NextResponse.json({ error: "Acceso no autorizado para esta organizacion" }, { status: 403 });
    }

    const tenant = getTenantFromRequest(request);
    const run = (sql: string, params: any[] = []) =>
      tenant ? queryWithTenant(tenant, sql, params) : pool.query(sql, params);

    const {
      lider_ids,
      comuna_ids,
      barrio_ids,
      zona,
      sexo,
      ciudadano_id,
      ciudadano_ids,
      mensaje,
      canal = "whatsapp",
      plantilla_nombre = process.env.WHATSAPP_TEMPLATE_NAME || "alerta_comunitaria",
      programado_para,
    } = await request.json();

    if (!mensaje || !mensaje.trim()) {
      return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
    }

    // Build filters for querying citizens
    const filters: any = {};
    if (lider_ids) filters.lider_ids = lider_ids;
    if (comuna_ids) filters.comuna_ids = comuna_ids;
    if (barrio_ids) filters.barrio_ids = barrio_ids;
    if (zona) filters.zona = zona;
    if (sexo) filters.sexo = sexo;
    if (ciudadano_id) filters.ciudadano_id = ciudadano_id;

    const conditions: string[] = ["c.telefono IS NOT NULL AND c.telefono != ''"];
    const qparams: any[] = [];
    let pCount = 1;

    if (ciudadano_ids && ciudadano_ids.length > 0) {
      conditions.push(`c.id = ANY($${pCount++})`);
      qparams.push(ciudadano_ids);
    } else if (ciudadano_id) {
      conditions.push(`c.id = $${pCount++}`);
      qparams.push(ciudadano_id);
    } else {
      if (token.role === "lider") {
        conditions.push(`c.lider_id = $${pCount++}`);
        qparams.push(token.userId);
      }
      if (lider_ids && lider_ids.length > 0) {
        conditions.push(`c.lider_id = ANY($${pCount++})`);
        qparams.push(lider_ids);
      }
      if (comuna_ids && comuna_ids.length > 0) {
        conditions.push(`c.id_comuna = ANY($${pCount++})`);
        qparams.push(comuna_ids);
      }
      if (barrio_ids && barrio_ids.length > 0) {
        conditions.push(`c.id_barrio = ANY($${pCount++})`);
        qparams.push(barrio_ids);
      }
      if (zona) {
        conditions.push(`c.zona = $${pCount++}`);
        qparams.push(zona);
      }
      if (sexo) {
        conditions.push(`c.sexo = $${pCount++}`);
        qparams.push(sexo);
      }
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const ciudadanosRes = await run(
      `SELECT c.id, c.nombre_completo, c.telefono FROM ciudadanos c ${where}`,
      qparams
    );

    const ciudadanos = ciudadanosRes.rows;
    if (ciudadanos.length === 0) {
      return NextResponse.json({ error: "No hay destinatarios con telefono para los filtros seleccionados" }, { status: 400 });
    }

    // Check if sending now (not scheduled)
    const isScheduled = !!programado_para;
    const scheduleTime = isScheduled ? new Date(programado_para) : null;

    // Create the send record
    const modo = ciudadano_id ? "individual" : "masivo";
    const insertRes = await pool.query(
      `INSERT INTO public.mensajes_enviados
       (tenant, canal, modo, mensaje, plantilla_nombre, destinatarios_count, filtros, programado_para, estado, enviado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        tenant,
        canal,
        modo,
        mensaje,
        plantilla_nombre,
        ciudadanos.length,
        JSON.stringify(filters),
        scheduleTime,
        isScheduled ? "pendiente" : "enviando",
        token.userId,
      ]
    );

    const envioId = insertRes.rows[0].id;

    if (isScheduled) {
      return NextResponse.json({
        message: "Envio programado correctamente",
        data: { id: envioId, programado_para: scheduleTime, estado: "pendiente" },
      });
    }

    // Execute send immediately
    let exitosos = 0;
    let fallidos = 0;
    const results: any[] = [];

    for (const ciudadano of ciudadanos) {
      let result: { success: boolean; messageId?: string; error?: string };
      const telefono = ciudadano.telefono.replace(/[^0-9]/g, "");

      if (canal === "whatsapp") {
        result = await sendWhatsAppTemplate(telefono, plantilla_nombre, [mensaje]);
      } else if (canal === "sms") {
        result = { success: false, error: "SMS no configurado. Conecta un proveedor SMS primero." };
      } else {
        result = { success: false, error: `Canal desconocido: ${canal}` };
      }

      if (result.success) {
        exitosos++;
      } else {
        fallidos++;
      }

      results.push(result);

      // Save individual result
      await pool.query(
        `INSERT INTO public.mensajes_individuales
         (mensaje_id, tenant, ciudadano_id, ciudadano_nombre, telefono, canal, estado, error_msg, meta_msg_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          envioId,
          tenant,
          ciudadano.id,
          ciudadano.nombre_completo,
          ciudadano.telefono,
          canal,
          result.success ? "sent" : "failed",
          result.error || null,
          result.messageId || null,
        ]
      );

      // Small delay between sends to avoid rate limits
      if (ciudadanos.length > 1) {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      }
    }

    // Update counts
    const finalEstado = fallidos === 0 ? "enviado" : exitosos > 0 ? "parcial" : "fallido";
    await pool.query(
      `UPDATE public.mensajes_enviados
       SET exitosos_count = $1, fallidos_count = $2, estado = $3, enviado_en = NOW()
       WHERE id = $4`,
      [exitosos, fallidos, finalEstado, envioId]
    );

    return NextResponse.json({
      message: `Envio completado: ${exitosos} enviados, ${fallidos} fallidos`,
      data: {
        id: envioId,
        total: ciudadanos.length,
        exitosos,
        fallidos,
        estado: finalEstado,
      },
    });
  } catch (err: any) {
    console.error("[mensajes/send] Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}
