import { Pool } from "pg";
import { ensureIdentificacionColumn } from "./db-init";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

export const pool = new Pool({
  connectionString,
});

let migrationTriggered = false;

const originalQuery = pool.query.bind(pool);

pool.query = async function (...args: any[]) {
  if (!migrationTriggered) {
    migrationTriggered = true;
    console.log("[DB] First query detected, triggering migration...");
    try {
      await ensureIdentificacionColumn();
      console.log("[DB] Migration triggered successfully");
    } catch (err: any) {
      console.error("[DB] Migration trigger failed:", err?.message);
    }
  }
  return originalQuery(...args);
} as any;
