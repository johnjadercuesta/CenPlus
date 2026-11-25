import { pool } from "./db";

export type AuditSeverity = "info" | "warning" | "error" | "critical";
export type AuditStatus = "success" | "error" | "blocked";

export interface AuditParams {
  tenant?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;
  module?: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  browser?: string;
  os?: string;
  status?: AuditStatus;
  errorMessage?: string;
  durationMs?: number;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
}

export async function recordAudit(params: AuditParams) {
  try {
    await pool.query(
      `INSERT INTO public.audit_logs (
        tenant, user_id, user_email, user_name, user_role,
        action, module, resource_type, resource_id,
        old_value, new_value,
        ip_address, user_agent, device_info, browser, os,
        status, error_message, duration_ms, severity, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        params.tenant || null,
        params.userId || null,
        params.userEmail || null,
        params.userName || null,
        params.userRole || null,
        params.action,
        params.module || null,
        params.resourceType || null,
        params.resourceId || null,
        params.oldValue ? JSON.stringify(params.oldValue) : null,
        params.newValue ? JSON.stringify(params.newValue) : null,
        params.ipAddress || null,
        params.userAgent || null,
        params.deviceInfo || null,
        params.browser || null,
        params.os || null,
        params.status || "success",
        params.errorMessage || null,
        params.durationMs || null,
        params.severity || "info",
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (error) {
    console.error("[AUDIT] Error recording audit log:", error);
  }
}

export async function recordFailedAction(params: {
  tenant?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  action: string;
  module?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}) {
  try {
    await recordAudit({
      tenant: params.tenant,
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      action: params.action,
      module: params.module || "security",
      status: "error",
      errorMessage: params.reason,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: "warning",
    });
  } catch (error) {
    console.error("[AUDIT] Error recording failed action:", error);
  }
}

export async function recordFailedLogin(params: {
  tenant?: string;
  identificacion: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO public.failed_logins (tenant, identificacion, ip_address, user_agent, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.tenant || null,
        params.identificacion,
        params.ipAddress || null,
        params.userAgent || null,
        params.reason || "invalid_credentials",
      ]
    );

    // Check for brute force (5+ failures in 15 minutes from same IP + tenant)
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM public.failed_logins 
       WHERE ip_address = $1 AND tenant = $2 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [params.ipAddress, params.tenant]
    );

    if (parseInt(rows[0].count) >= 5) {
      await createSecurityAlert({
        tenant: params.tenant,
        alertType: "brute_force",
        severity: "critical",
        title: "Posible ataque de fuerza bruta detectado",
        description: `Se detectaron ${rows[0].count} intentos fallidos de login desde la IP ${params.ipAddress} en los ultimos 15 minutos`,
        ipAddress: params.ipAddress,
        metadata: { identificacion: params.identificacion },
      });
    }
  } catch (error) {
    console.error("[AUDIT] Error recording failed login:", error);
  }
}

export interface SecurityAlertParams {
  tenant?: string;
  alertType: string;
  severity: AuditSeverity;
  title: string;
  description?: string;
  userEmail?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export async function createSecurityAlert(params: SecurityAlertParams) {
  try {
    await pool.query(
      `INSERT INTO public.security_alerts (tenant, alert_type, severity, title, description, user_email, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.tenant || null,
        params.alertType,
        params.severity,
        params.title,
        params.description || null,
        params.userEmail || null,
        params.ipAddress || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (error) {
    console.error("[AUDIT] Error creating security alert:", error);
  }
}

export async function recordSystemEvent(params: {
  eventType: string;
  source?: string;
  message?: string;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
  durationMs?: number;
  tenant?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO public.system_events (event_type, source, message, severity, metadata, duration_ms, tenant)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.eventType,
        params.source || null,
        params.message || null,
        params.severity || "info",
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.durationMs || null,
        params.tenant || null,
      ]
    );
  } catch (error) {
    console.error("[AUDIT] Error recording system event:", error);
  }
}

// Convenience functions for common actions
export async function logLogin(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
}) {
  await recordAudit({
    ...params,
    action: "inicio_sesion",
    module: "autenticacion",
    severity: "info",
  });
}

export async function logLogout(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
}) {
  await recordAudit({
    ...params,
    action: "cierre_sesion",
    module: "autenticacion",
    severity: "info",
  });
}

export async function logPasswordChange(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
}) {
  await recordAudit({
    ...params,
    action: "cambio_contrasena",
    module: "autenticacion",
    severity: "warning",
  });
}

export async function logRecordCreate(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  module: string;
  resourceType: string;
  resourceId: string;
  newValue?: any;
}) {
  await recordAudit({
    ...params,
    action: "crear_registro",
    severity: "info",
  });
}

export async function logRecordUpdate(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  module: string;
  resourceType: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
}) {
  await recordAudit({
    ...params,
    action: "actualizar_registro",
    severity: "info",
  });
}

export async function logRecordDelete(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  module: string;
  resourceType: string;
  resourceId: string;
}) {
  await recordAudit({
    ...params,
    action: "eliminar_registro",
    severity: "warning",
  });
}

export async function logConfigChange(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  oldValue?: any;
  newValue?: any;
}) {
  await recordAudit({
    ...params,
    action: "cambio_configuracion",
    module: "configuracion",
    severity: "warning",
  });
}

export async function logExport(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  module: string;
  metadata?: Record<string, any>;
}) {
  await recordAudit({
    ...params,
    action: "exportar_datos",
    severity: "info",
  });
}

export async function logImport(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  module: string;
  metadata?: Record<string, any>;
}) {
  await recordAudit({
    ...params,
    action: "importar_datos",
    severity: "info",
  });
}

export async function logPermissionChange(params: {
  tenant: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole?: string;
  resourceType: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
}) {
  await recordAudit({
    ...params,
    action: "cambio_permisos",
    module: "usuarios",
    severity: "critical",
  });

  await createSecurityAlert({
    tenant: params.tenant,
    alertType: "permission_change",
    severity: "warning",
    title: `Cambio de permisos detectado`,
    description: `El usuario ${params.userName} modifico los permisos de ${params.resourceType} #${params.resourceId}`,
    userEmail: params.userEmail,
  });
}

// Backwards compatibility
export async function recordLog(params: {
  tenant: string;
  email: string;
  nombre?: string;
  modulo: string;
  accion: string;
}) {
  await recordAudit({
    tenant: params.tenant,
    userEmail: params.email,
    userName: params.nombre || params.email,
    module: params.modulo,
    action: params.accion,
    severity: "info",
  });
}
