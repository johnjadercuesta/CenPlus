import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireModule } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModule(request, "auditoria");
    if (auth.error) return auth.error;
    const tenant = auth.user.tenant;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Total logs
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*) as total FROM public.audit_logs WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
      [tenant]
    );

    // Logs by severity
    const { rows: severityRows } = await pool.query(
      `SELECT severity, COUNT(*) as count 
       FROM public.audit_logs 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY severity ORDER BY count DESC`,
      [tenant]
    );

    // Logs by module
    const { rows: moduleRows } = await pool.query(
      `SELECT module, COUNT(*) as count 
       FROM public.audit_logs 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days' AND module IS NOT NULL
       GROUP BY module ORDER BY count DESC LIMIT 10`,
      [tenant]
    );

    // Logs by action
    const { rows: actionRows } = await pool.query(
      `SELECT action, COUNT(*) as count 
       FROM public.audit_logs 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY action ORDER BY count DESC LIMIT 10`,
      [tenant]
    );

    // Top users
    const { rows: userRows } = await pool.query(
      `SELECT user_email, user_name, COUNT(*) as count 
       FROM public.audit_logs 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days' AND user_email IS NOT NULL
       GROUP BY user_email, user_name ORDER BY count DESC LIMIT 10`,
      [tenant]
    );

    // Failed logins count
    const { rows: failedLoginRows } = await pool.query(
      `SELECT COUNT(*) as total FROM public.failed_logins WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
      [tenant]
    );

    // Security alerts
    const { rows: alertRows } = await pool.query(
      `SELECT severity, COUNT(*) as count, 
              SUM(CASE WHEN is_resolved THEN 0 ELSE 1 END) as unresolved
       FROM public.security_alerts 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY severity ORDER BY count DESC`,
      [tenant]
    );

    // Daily activity
    const { rows: dailyRows } = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM public.audit_logs 
       WHERE tenant = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at) ORDER BY date`,
      [tenant]
    );

    // Error logs
    const { rows: errorRows } = await pool.query(
      `SELECT COUNT(*) as total FROM public.audit_logs 
       WHERE tenant = $1 AND status = 'error' AND created_at > NOW() - INTERVAL '${days} days'`,
      [tenant]
    );

    return NextResponse.json({
      total: parseInt(totalRows[0].total),
      bySeverity: severityRows.map(r => ({ severity: r.severity, count: parseInt(r.count) })),
      byModule: moduleRows.map(r => ({ module: r.module, count: parseInt(r.count) })),
      byAction: actionRows.map(r => ({ action: r.action, count: parseInt(r.count) })),
      topUsers: userRows.map(r => ({ email: r.user_email, name: r.user_name, count: parseInt(r.count) })),
      failedLogins: parseInt(failedLoginRows[0].total),
      alerts: alertRows.map(r => ({ severity: r.severity, count: parseInt(r.count), unresolved: parseInt(r.unresolved) })),
      dailyActivity: dailyRows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      errors: parseInt(errorRows[0].total),
    });
  } catch (err: any) {
    console.error("[audit stats] Error:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
