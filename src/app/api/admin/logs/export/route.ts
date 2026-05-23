import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || token.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }

    const tenant = token.tenant;
    if (!tenant) {
      return NextResponse.json({ error: "No se pudo detectar la organizacion" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") || "";
    const action = searchParams.get("action") || "";
    const severity = searchParams.get("severity") || "";
    const status = searchParams.get("status") || "";
    const userEmail = searchParams.get("userEmail") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT id, created_at, user_email, user_name, user_role, action, module, 
              resource_type, resource_id, status, severity, ip_address, 
              old_value, new_value, error_message
       FROM public.audit_logs 
       ${whereClause}
       ORDER BY created_at DESC`,
      values
    );

    const headers = [
      "ID", "Fecha", "Email", "Nombre", "Rol", "Accion", "Modulo",
      "Tipo Recurso", "ID Recurso", "Estado", "Severidad", "IP",
      "Valor Anterior", "Valor Nuevo", "Error"
    ];

    const csvRows = [headers.join(",")];

    for (const row of rows) {
      const csvRow = [
        row.id,
        `"${new Date(row.created_at).toLocaleString("es-CO")}"`,
        `"${row.user_email || ""}"`,
        `"${row.user_name || ""}"`,
        `"${row.user_role || ""}"`,
        `"${row.action || ""}"`,
        `"${row.module || ""}"`,
        `"${row.resource_type || ""}"`,
        `"${row.resource_id || ""}"`,
        `"${row.status || ""}"`,
        `"${row.severity || ""}"`,
        `"${row.ip_address || ""}"`,
        `"${row.old_value ? JSON.stringify(row.old_value).replace(/"/g, '""') : ""}"`,
        `"${row.new_value ? JSON.stringify(row.new_value).replace(/"/g, '""') : ""}"`,
        `"${(row.error_message || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(csvRow.join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[audit export] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
