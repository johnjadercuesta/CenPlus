import { NextRequest, NextResponse } from "next/server";
import { ensureIdentificacionColumn, getMigrationStatus } from "@/lib/db-init";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const result = await ensureIdentificacionColumn();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[migrate-identificacion] Error:", err.message);
    return NextResponse.json({ error: "Error: " + (err?.message || "Desconocido") }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(getMigrationStatus());
}
