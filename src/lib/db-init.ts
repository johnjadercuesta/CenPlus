import { pool } from "./db";

let migrationRunning = false;
let migrationComplete = false;
let lastError: string | null = null;

export async function ensureIdentificacionColumn() {
  if (migrationComplete) return { success: true, message: "Migration already completed" };
  if (migrationRunning) return { success: false, message: "Migration already running" };
  
  migrationRunning = true;
  lastError = null;

  try {
    console.log("[DB-INIT] Starting identificacion column migration...");

    // 1. Create public.user_tenants table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_tenants (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          tenant VARCHAR(63) NOT NULL,
          identificacion VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("[DB-INIT] public.user_tenants table ready");
    } catch (e: any) {
      console.error("[DB-INIT] Error creating user_tenants:", e.message);
      lastError = "user_tenants: " + e.message;
    }

    // 2. Add identificacion column to public.user_tenants
    try {
      await pool.query(`
        ALTER TABLE public.user_tenants 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
      `);
      await pool.query(`
        UPDATE public.user_tenants 
        SET identificacion = email 
        WHERE identificacion IS NULL
      `);
      console.log("[DB-INIT] public.user_tenants.identificacion ready");
    } catch (e: any) {
      console.error("[DB-INIT] Error adding identificacion to user_tenants:", e.message);
      lastError = "user_tenants identificacion: " + e.message;
    }

    // 3. Get all tenant schemas
    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') 
        AND schema_name NOT LIKE 'pg_%'
    `);

    console.log(`[DB-INIT] Found ${schemas.length} tenant schemas`);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      
      // Check if admins table exists in this schema
      const { rows: tableExists } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'admins'
        )
      `, [schemaName]);

      if (!tableExists[0].exists) {
        console.log(`[DB-INIT] Skipping ${schemaName}: admins table does not exist`);
        continue;
      }

      // Add identificacion column
      try {
        await pool.query(`
          ALTER TABLE "${schemaName}".admins 
          ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
        `);
        console.log(`[DB-INIT] ${schemaName}.admins: identificacion column added`);
      } catch (e: any) {
        console.error(`[DB-INIT] Error adding identificacion to ${schemaName}.admins:`, e.message);
        lastError = `${schemaName}.admins: ${e.message}`;
      }
      
      // Populate identificacion with email values
      try {
        await pool.query(`
          UPDATE "${schemaName}".admins 
          SET identificacion = email 
          WHERE identificacion IS NULL
        `);
      } catch (e: any) {
        console.error(`[DB-INIT] Error populating identificacion in ${schemaName}.admins:`, e.message);
      }
    }

    migrationComplete = true;
    console.log("[DB-INIT] Migration completed successfully");
    return { success: true, message: "Migration completed", schemas: schemas.length };
  } catch (err: any) {
    console.error("[DB-INIT] Migration error:", err?.message);
    lastError = err?.message || "Unknown error";
    migrationRunning = false;
    return { success: false, message: lastError };
  }
}

export function getMigrationStatus() {
  return {
    complete: migrationComplete,
    running: migrationRunning,
    lastError,
  };
}
