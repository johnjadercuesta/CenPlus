import { NextRequest, NextResponse } from "next/server";
import { startScheduler } from "@/lib/jobs";
import { pool } from "@/lib/db";

let schedulerStarted = false;
let migrationDone = false;

async function runIdentificacionMigration() {
  if (migrationDone) return;
  migrationDone = true;

  console.log("[MIGRATION] Starting identificacion column migration...");

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

    await pool.query(`
      ALTER TABLE public.user_tenants 
      ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
    `);

    await pool.query(`
      UPDATE public.user_tenants 
      SET identificacion = email 
      WHERE identificacion IS NULL
    `);

    const { rows: schemas } = await pool.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public') 
        AND schema_name NOT LIKE 'pg_%'
    `);

    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      await pool.query(`
        ALTER TABLE "${schemaName}".admins 
        ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50)
      `);
      await pool.query(`
        UPDATE "${schemaName}".admins 
        SET identificacion = email 
        WHERE identificacion IS NULL
      `);
      console.log(`[MIGRATION] ${schemaName}.admins: identificacion column ready`);
    }

    console.log("[MIGRATION] identificacion migration completed successfully");
  } catch (err: any) {
    console.error("[MIGRATION] Error during identificacion migration:", err?.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (schedulerStarted) {
      return NextResponse.json({
        message: "Scheduler already initialized",
        status: "already-running"
      }, { status: 200 });
    }

    await runIdentificacionMigration();

    const schedulerResult = await startScheduler("24h");
    
    schedulerStarted = true;

    console.log("[INIT] Application initialization complete");
    console.log("[INIT] Scheduler started", schedulerResult);

    return NextResponse.json({
      success: true,
      message: "Application initialized successfully",
      scheduler: schedulerResult,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (err) {
    console.error("[INIT] Error during initialization:", err);
    return NextResponse.json(
      { 
        success: false,
        error: String(err),
        message: "Initialization failed"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: schedulerStarted ? "initialized" : "not-initialized",
    schedulerRunning: schedulerStarted,
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
