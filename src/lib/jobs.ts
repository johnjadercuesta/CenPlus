import { pool } from "@/lib/db";
import { queryWithTenant } from "@/lib/tenant";
import cron from "node-cron";

let scheduledJob: cron.ScheduledTask | null = null;
let messagingJob: cron.ScheduledTask | null = null;

async function runQuery(sql: string, params: any[] = [], tenant?: string | null) {
  if (tenant) return await queryWithTenant(tenant, sql, params);
  return await pool.query(sql, params);
}

export async function deleteExpiredTrends(tenant?: string | null) {
  const res = await runQuery(
    `DELETE FROM trendsmap_entries WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`,
    [],
    tenant
  );
  return res.rows.length;
}

export async function countExpiredTrends(tenant?: string | null) {
  const res = await runQuery(
    `SELECT COUNT(*)::int AS cnt FROM trendsmap_entries WHERE expires_at IS NOT NULL AND expires_at < NOW()`,
    [],
    tenant
  );
  return res.rows[0]?.cnt || 0;
}

export async function startScheduler(interval: string = "24h"): Promise<{ success: boolean; message: string }> {
  try {
    let cronSchedule: string;
    switch (interval) {
      case "24h":
        cronSchedule = "0 0 * * *";
        break;
      case "12h":
        cronSchedule = "0 0,12 * * *";
        break;
      case "6h":
        cronSchedule = "0 */6 * * *";
        break;
      case "4h":
        cronSchedule = "0 */4 * * *";
        break;
      default:
        cronSchedule = "0 0 * * *";
    }

    scheduledJob = cron.schedule(cronSchedule, async () => {
      const timestamp = new Date().toISOString();
      console.log(`[CRON] ${timestamp} - Limpiando tendencias expiradas por tenant...`);
      try {
        // Enumerar esquemas/tenants y ejecutar limpieza por cada uno
        const { rows: schemas } = await pool.query(`
          SELECT schema_name FROM information_schema.schemata
          WHERE schema_name NOT IN ('public', 'information_schema')
            AND schema_name NOT LIKE 'pg_%'
        `);

        for (const s of schemas) {
          try {
            const tenantName = s.schema_name;
            const deleted = await deleteExpiredTrends(tenantName);
            if (deleted > 0) {
              console.log(`[CRON] ${new Date().toISOString()} - tenant=${tenantName} - ${deleted} tendencias expiradas eliminadas`);
            }
          } catch (err) {
            console.error(`[CRON] Error limpiando tenant ${s.schema_name}:`, err);
          }
        }
      } catch (err) {
        console.error(`[CRON] Error enumerando esquemas para limpieza:`, err);
      }
    });

    console.log(`[CRON] Scheduler iniciado con intervalo: ${interval} (cron: ${cronSchedule})`);
    return { success: true, message: `Scheduler iniciado cada ${interval}` };
  } catch (err) {
    console.error("[CRON] Error iniciando scheduler:", err);
    return { success: false, message: String(err) };
  }
}

export async function startMessagingScheduler(): Promise<{ success: boolean; message: string }> {
  try {
    messagingJob = cron.schedule("* * * * *", async () => {
      console.log("[CRON] Revisando envios programados...");
      try {
        const { rows: pendientes } = await pool.query(
          `SELECT id, tenant, canal, mensaje, plantilla_nombre, filtros
           FROM public.mensajes_enviados
           WHERE estado = 'pendiente' AND programado_para IS NOT NULL AND programado_para <= NOW()`
        );

        for (const envio of pendientes) {
          try {
            console.log(`[CRON] Ejecutando envio programado #${envio.id} (tenant: ${envio.tenant})`);

            await pool.query(
              `UPDATE public.mensajes_enviados SET estado = 'enviando' WHERE id = $1`,
              [envio.id]
            );

            const filtros = typeof envio.filtros === "string" ? JSON.parse(envio.filtros) : envio.filtros || {};

            const conditions: string[] = ["c.telefono IS NOT NULL AND c.telefono != ''"];
            const qparams: any[] = [];
            let pCount = 1;

            if (filtros.lider_ids?.length) {
              conditions.push(`c.lider_id = ANY($${pCount++})`);
              qparams.push(filtros.lider_ids);
            }
            if (filtros.comuna_ids?.length) {
              conditions.push(`c.id_comuna = ANY($${pCount++})`);
              qparams.push(filtros.comuna_ids);
            }
            if (filtros.barrio_ids?.length) {
              conditions.push(`c.id_barrio = ANY($${pCount++})`);
              qparams.push(filtros.barrio_ids);
            }
            if (filtros.zona) {
              conditions.push(`c.zona = $${pCount++}`);
              qparams.push(filtros.zona);
            }
            if (filtros.sexo) {
              conditions.push(`c.sexo = $${pCount++}`);
              qparams.push(filtros.sexo);
            }

            const where = "WHERE " + conditions.join(" AND ");
            const ciudadanosRes = await queryWithTenant(
              envio.tenant,
              `SELECT c.id, c.nombre_completo, c.telefono FROM ciudadanos c ${where}`,
              qparams
            );

            const { sendWhatsAppTemplate } = await import("@/lib/whatsapp-meta");
            let exitosos = 0;
            let fallidos = 0;

            for (const ciudadano of ciudadanosRes.rows) {
              const telefono = ciudadano.telefono.replace(/[^0-9]/g, "");
              const result = await sendWhatsAppTemplate(telefono, envio.plantilla_nombre || "alerta_comunitaria", [envio.mensaje]);

              if (result.success) {
                exitosos++;
              } else {
                fallidos++;
              }

              await pool.query(
                `INSERT INTO public.mensajes_individuales
                 (mensaje_id, tenant, ciudadano_id, ciudadano_nombre, telefono, canal, estado, error_msg, meta_msg_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  envio.id,
                  envio.tenant,
                  ciudadano.id,
                  ciudadano.nombre_completo,
                  ciudadano.telefono,
                  envio.canal || "whatsapp",
                  result.success ? "sent" : "failed",
                  result.error || null,
                  result.messageId || null,
                ]
              );

              await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
            }

            const finalEstado = fallidos === 0 ? "enviado" : exitosos > 0 ? "parcial" : "fallido";
            await pool.query(
              `UPDATE public.mensajes_enviados
               SET exitosos_count = $1, fallidos_count = $2, estado = $3, enviado_en = NOW()
               WHERE id = $4`,
              [exitosos, fallidos, finalEstado, envio.id]
            );
          } catch (err) {
            console.error(`[CRON] Error ejecutando envio #${envio.id}:`, err);
          }
        }
      } catch (err) {
        console.error("[CRON] Error revisando envios programados:", err);
      }
    });

    console.log("[CRON] Messaging scheduler iniciado (cada 60s)");
    return { success: true, message: "Messaging scheduler iniciado" };
  } catch (err) {
    console.error("[CRON] Error iniciando messaging scheduler:", err);
    return { success: false, message: String(err) };
  }
}

export async function stopMessagingScheduler(): Promise<{ success: boolean; message: string }> {
  try {
    if (messagingJob) {
      messagingJob.stop();
      messagingJob = null;
      console.log("[CRON] Messaging scheduler detenido");
      return { success: true, message: "Messaging scheduler detenido" };
    }
    return { success: false, message: "No hay messaging scheduler activo" };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

export async function stopScheduler(): Promise<{ success: boolean; message: string }> {
  try {
    if (scheduledJob) {
      scheduledJob.stop();
      scheduledJob = null;
      console.log("[CRON] Scheduler detenido");
      return { success: true, message: "Scheduler detenido correctamente" };
    } else {
      return { success: false, message: "No hay scheduler activo" };
    }
  } catch (err) {
    console.error("[CRON] Error deteniendo scheduler:", err);
    return { success: false, message: String(err) };
  }
}

export function getMessagingSchedulerStatus() {
  return {
    active: messagingJob !== null,
    status: messagingJob ? "running" : "stopped",
  };
}

export function getSchedulerStatus(): {
  active: boolean;
  next_run: Date | string;
  status: string;
} {
  return {
    active: scheduledJob !== null,
    next_run: scheduledJob ? "próxima ejecución según configuración" : "no configurado",
    status: scheduledJob ? "running" : "stopped"
  };
}
