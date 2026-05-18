import { pool } from "./db";

let migrationRunning = false;
let migrationComplete = false;

export async function ensureIdentificacionColumn() {
  if (migrationComplete || migrationRunning) return;
  migrationRunning = true;

  try {
    console.log("[DB-INIT] Running identificacion column migration...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant VARCHAR(63) NOT NULL,
        identificacion VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    try {
      await pool.query(`
        ALTER TABLE public.user_tenants 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
      `);
    } catch (e) {}

    try {
      await pool.query(`
        UPDATE public.user_tenants 
        SET identificacion = email 
        WHERE identificacion IS NULL
      `);
    } catch (e) {}

    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') 
        AND schema_name NOT LIKE 'pg_%'
    `);

    console.log(`[DB-INIT] Found ${schemas.length} tenant schemas`);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      try {
        await pool.query(`
          ALTER TABLE "${schemaName}".admins 
          ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
        `);
      } catch (e) {}
      
      try {
        await pool.query(`
          UPDATE "${schemaName}".admins 
          SET identificacion = email 
          WHERE identificacion IS NULL
        `);
      } catch (e) {}
      
      console.log(`[DB-INIT] ${schemaName}.admins: identificacion column ready`);
    }

    migrationComplete = true;
    console.log("[DB-INIT] identificacion migration completed successfully");
  } catch (err: any) {
    console.error("[DB-INIT] Migration error:", err?.message);
    migrationRunning = false;
  }
}
