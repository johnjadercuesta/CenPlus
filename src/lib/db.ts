import { Pool } from "pg";
import { ensureIdentificacionColumn } from "./db-init";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

export const pool = new Pool({
  connectionString,
  max: 20,                    // máximo de conexiones concurrentes
  idleTimeoutMillis: 30_000,  // cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5_000, // error si no hay conexión disponible en 5s
});

// Inicialización única al arrancar — no intercepta pool.query
let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await ensureIdentificacionColumn();
  } catch (err: any) {
    console.error("[DB] Startup migration failed:", err?.message);
  }
}

// Disparar migración en el primer import (fire-and-forget, no bloquea)
initDb().catch(() => {});
