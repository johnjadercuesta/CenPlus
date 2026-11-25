import { NextRequest, NextResponse } from "next/server";
import { requireAnyModule } from "@/lib/auth";
import { getTrendGrowth } from "@/lib/trendsmap";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAnyModule(request, ["inteligencia", "mapa", "dashboard"]);
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get("hours") || "24"), 168);

    const growth = await getTrendGrowth(hours, tenant);

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
