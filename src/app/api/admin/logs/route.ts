import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";
import { queryWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModule(request, "auditoria");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const module = searchParams.get("module") || "";
    const action = searchParams.get("action") || "";
    const severity = searchParams.get("severity") || "";
    const status = searchParams.get("status") || "";
    const userEmail = searchParams.get("userEmail") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    conditions.push(`tenant = $${paramCount++}`);
    values.push(tenant);

    if (module) {
      conditions.push(`module = $${paramCount++}`);
      values.push(module);
    }
    if (action) {
      conditions.push(`action = $${paramCount++}`);
      values.push(action);
    }
    if (severity) {
      conditions.push(`severity = $${paramCount++}`);
      values.push(severity);
    }
    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (userEmail) {
      conditions.push(`user_email ILIKE $${paramCount++}`);
      values.push(`%${userEmail}%`);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(endDate + "T23:59:59");
    }
    if (search) {
      conditions.push(`(user_name ILIKE $${paramCount++} OR action ILIKE $${paramCount++} OR module ILIKE $${paramCount++} OR CAST(old_value AS TEXT) ILIKE $${paramCount++} OR CAST(new_value AS TEXT) ILIKE $${paramCount++})`);
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: logs } = await pool.query(
      `SELECT * FROM public.audit_logs 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...values, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM public.audit_logs ${whereClause}`,
      values
    );
    const total = parseInt(countRows[0].total);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[audit logs] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
