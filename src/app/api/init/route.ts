import { NextRequest, NextResponse } from "next/server";
import { startScheduler } from "@/lib/jobs";

let schedulerStarted = false;

/**
 * POST /api/init
 * Initializes application services including the scheduler
 * Called once when the app starts
 */
export async function POST(request: NextRequest) {
  try {
    if (schedulerStarted) {
      return NextResponse.json({
        message: "Scheduler already initialized",
        status: "already-running"
      }, { status: 200 });
    }

    // Start the market intelligence data synchronization scheduler
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

/**
 * GET /api/init
 * Health check and initialization status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: schedulerStarted ? "initialized" : "not-initialized",
    schedulerRunning: schedulerStarted,
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
