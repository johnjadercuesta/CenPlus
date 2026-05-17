import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'administrador') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = getTenantFromRequest(request);
    if (!tenant) {
        return NextResponse.json({ error: "Contexto no válido" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "SELECT * FROM public.system_logs WHERE tenant = $1 ORDER BY created_at DESC LIMIT 200",
      [tenant]
    );

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
