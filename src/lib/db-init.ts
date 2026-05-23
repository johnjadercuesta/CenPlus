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
    }

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
    }

    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') 
        AND schema_name NOT LIKE 'pg_%'
    `);

    console.log(`[DB-INIT] Found ${schemas.length} tenant schemas`);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      
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

    // Create/fix audit tables
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id SERIAL PRIMARY KEY,
          tenant VARCHAR(63),
          user_id INTEGER,
          user_email VARCHAR(255),
          user_name VARCHAR(255),
          user_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          module VARCHAR(100),
          resource_type VARCHAR(100),
          resource_id VARCHAR(255),
          old_value JSONB,
          new_value JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          device_info VARCHAR(255),
          browser VARCHAR(100),
          os VARCHAR(100),
          status VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          duration_ms INTEGER,
          severity VARCHAR(20) DEFAULT 'info',
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("[DB-INIT] public.audit_logs table ready");
    } catch (e: any) {
      console.error("[DB-INIT] Error creating audit_logs:", e.message);
    }

    // Add missing columns to audit_logs if they don't exist
    try {
      await pool.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='user_id') THEN
            ALTER TABLE public.audit_logs ADD COLUMN user_id INTEGER;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_type') THEN
            ALTER TABLE public.audit_logs ADD COLUMN resource_type VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='resource_id') THEN
            ALTER TABLE public.audit_logs ADD COLUMN resource_id VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='old_value') THEN
            ALTER TABLE public.audit_logs ADD COLUMN old_value JSONB;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='new_value') THEN
            ALTER TABLE public.audit_logs ADD COLUMN new_value JSONB;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='ip_address') THEN
            ALTER TABLE public.audit_logs ADD COLUMN ip_address VARCHAR(45);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='user_agent') THEN
            ALTER TABLE public.audit_logs ADD COLUMN user_agent TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='device_info') THEN
            ALTER TABLE public.audit_logs ADD COLUMN device_info VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='browser') THEN
            ALTER TABLE public.audit_logs ADD COLUMN browser VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='os') THEN
            ALTER TABLE public.audit_logs ADD COLUMN os VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='status') THEN
            ALTER TABLE public.audit_logs ADD COLUMN status VARCHAR(20) DEFAULT 'success';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='error_message') THEN
            ALTER TABLE public.audit_logs ADD COLUMN error_message TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='duration_ms') THEN
            ALTER TABLE public.audit_logs ADD COLUMN duration_ms INTEGER;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='severity') THEN
            ALTER TABLE public.audit_logs ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='metadata') THEN
            ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB;
          END IF;
        END $$;
      `);
      console.log("[DB-INIT] public.audit_logs columns verified");
    } catch (e: any) {
      console.error("[DB-INIT] Error verifying audit_logs columns:", e.message);
    }

    // Create other audit tables
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.failed_logins (
          id SERIAL PRIMARY KEY,
          tenant VARCHAR(63),
          identificacion VARCHAR(50),
          ip_address VARCHAR(45),
          user_agent TEXT,
          reason VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.security_alerts (
          id SERIAL PRIMARY KEY,
          tenant VARCHAR(63),
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(255),
          description TEXT,
          user_email VARCHAR(255),
          ip_address VARCHAR(45),
          metadata JSONB,
          is_resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP,
          resolved_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.system_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          source VARCHAR(100),
          message TEXT,
          severity VARCHAR(20) DEFAULT 'info',
          metadata JSONB,
          duration_ms INTEGER,
          tenant VARCHAR(63),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("[DB-INIT] Audit system tables ready");
    } catch (e: any) {
      console.error("[DB-INIT] Error creating audit tables:", e.message);
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
