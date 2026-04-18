import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { getTrendGrowth } from "@/lib/trendsmap";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get("hours") || "24"), 168);

    const growth = await getTrendGrowth(hours);

    return NextResponse.json({
      success: true,
      hours,
      count: growth.length,
      growth: growth.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
