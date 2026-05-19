import { NextRequest, NextResponse } from "next/server";
import { startScheduler } from "@/lib/jobs";
import { ensureIdentificacionColumn } from "@/lib/db-init";

let schedulerStarted = false;

export async function POST(request: NextRequest) {
  try {
    if (schedulerStarted) {
      return NextResponse.json({
        message: "Scheduler already initialized",
        status: "already-running"
      }, { status: 200 });
    }

    // Run migration first
    console.log("[INIT] Running identificacion migration...");
    const migrationResult = await ensureIdentificacionColumn();
    console.log("[INIT] Migration result:", migrationResult);

    // Start scheduler
    const schedulerResult = await startScheduler("24h");
    
    schedulerStarted = true;

    console.log("[INIT] Application initialization complete");
    console.log("[INIT] Scheduler started", schedulerResult);

    return NextResponse.json({
      success: true,
      message: "Application initialized successfully",
      migration: migrationResult,
      scheduler: schedulerResult,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (err: any) {
    console.error("[INIT] Error during initialization:", err.message);
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
