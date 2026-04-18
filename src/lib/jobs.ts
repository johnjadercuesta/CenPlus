import { pool } from "@/lib/db";
import cron from "node-cron";

let scheduledJob: cron.ScheduledTask | null = null;

export async function deleteExpiredTrends() {
  const { rows } = await pool.query(
    `DELETE FROM trendsmap_entries WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`
  );
  return rows.length;
}

export async function countExpiredTrends() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM trendsmap_entries WHERE expires_at IS NOT NULL AND expires_at < NOW()`
  );
  return rows[0]?.cnt || 0;
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
      console.log(`[CRON] ${timestamp} - Limpiando tendencias expiradas...`);
      try {
        const deleted = await deleteExpiredTrends();
        if (deleted > 0) {
          console.log(`[CRON] ${new Date().toISOString()} - ${deleted} tendencias expiradas eliminadas`);
        }
      } catch (err) {
        console.error(`[CRON] Error limpiando tendencias:`, err);
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
