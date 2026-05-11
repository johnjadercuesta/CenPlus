import { pool } from "@/lib/db";
import { queryWithTenant } from "@/lib/tenant";
import cron from "node-cron";

let scheduledJob: cron.ScheduledTask | null = null;

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
