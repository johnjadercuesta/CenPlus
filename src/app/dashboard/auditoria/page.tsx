"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: number;
  tenant: string;
  user_id: number;
  user_email: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  user_agent: string;
  device_info: string;
  browser: string;
  os: string;
  status: string;
  error_message: string;
  duration_ms: number;
  severity: string;
  metadata: any;
  created_at: string;
}

interface Stats {
  total: number;
  bySeverity: { severity: string; count: number }[];
  byModule: { module: string; count: number }[];
  byAction: { action: string; count: number }[];
  topUsers: { email: string; name: string; count: number }[];
  failedLogins: number;
  alerts: { severity: string; count: number; unresolved: number }[];
  dailyActivity: { date: string; count: number }[];
  errors: number;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  user_email: string;
  ip_address: string;
  is_resolved: boolean;
  created_at: string;
}

type TabType = "logs" | "stats" | "alerts";

export default function AuditoriaPage() {
  const [activeTab, setActiveTab] = useState<TabType>("logs");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    module: "",
    action: "",
    severity: "",
    status: "",
    userEmail: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [daysRange, setDaysRange] = useState(30);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchAlerts();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "")
        ),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalLogs(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/admin/logs/stats?days=${daysRange}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/admin/alerts?resolved=false");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== "")
    );
    window.open(`/api/admin/logs/export?${params}`, "_blank");
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/admin/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertId }),
      });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilters({
      module: "",
      action: "",
      severity: "",
      status: "",
      userEmail: "",
      startDate: "",
      endDate: "",
      search: "",
    });
    setPage(1);
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "#ef4444";
      case "error": return "#f97316";
      case "warning": return "#eab308";
      default: return "#3b82f6";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "success": return "#10b981";
      case "error": return "#ef4444";
      case "blocked": return "#f97316";
      default: return "#64748b";
    }
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "inicio_sesion": return "🔑";
      case "cierre_sesion": return "🚪";
      case "cambio_contrasena": return "🔒";
      case "crear_registro": return "➕";
      case "actualizar_registro": return "✏️";
      case "eliminar_registro": return "️";
      case "exportar_datos": return "📤";
      case "importar_datos": return "📥";
      case "cambio_configuracion": return "️";
      case "cambio_permisos": return "🛡️";
      default: return "📋";
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: 0 }}>Auditoría del Sistema</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            Registro completo de actividad · {totalLogs} eventos registrados
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 16px", background: "#10b981", color: "white",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{
          padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#991b1b", fontSize: 14 }}>{alerts.length} alertas de seguridad pendientes</strong>
            <p style={{ color: "#b91c1c", fontSize: 12, margin: "2px 0 0" }}>
              {alerts.filter(a => a.severity === "critical").length} críticas · {alerts.filter(a => a.severity === "warning").length} advertencias
            </p>
          </div>
          <button
            onClick={() => setActiveTab("alerts")}
            style={{
              padding: "6px 12px", background: "#ef4444", color: "white",
              border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Ver Alertas →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" }}>
        {[
          { key: "logs" as TabType, label: " Registros" },
          { key: "stats" as TabType, label: "📊 Estadísticas" },
          { key: "alerts" as TabType, label: ` Alertas${alerts.length > 0 ? ` (${alerts.length})` : ""}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "10px 20px", border: "none", background: "none",
              cursor: "pointer", fontWeight: 600, fontSize: 14,
              borderBottom: activeTab === t.key ? "2px solid #3b82f6" : "none",
              color: activeTab === t.key ? "#3b82f6" : "#64748b",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <>
          {/* Filters Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: "8px 16px", background: showFilters ? "#3b82f6" : "#f1f5f9",
                color: showFilters ? "white" : "#475569", border: "none",
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {showFilters ? "✕ Ocultar Filtros" : "🔍 Mostrar Filtros"}
            </button>
            {showFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: "8px 16px", background: "#f1f5f9", color: "#475569",
                  border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer",
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div style={{
              padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 10, marginBottom: 16, display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12,
            }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Módulo</label>
                <select
                  value={filters.module}
                  onChange={e => { setFilters(f => ({ ...f, module: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">Todos</option>
                  <option value="autenticacion">Autenticación</option>
                  <option value="ciudadanos">Ciudadanos</option>
                  <option value="lideres">Líderes</option>
                  <option value="sectores">Sectores</option>
                  <option value="configuracion">Configuración</option>
                  <option value="usuarios">Usuarios</option>
                  <option value="archivos">Archivos</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Acción</label>
                <select
                  value={filters.action}
                  onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">Todas</option>
                  <option value="inicio_sesion">Inicio Sesión</option>
                  <option value="cierre_sesion">Cierre Sesión</option>
                  <option value="crear_registro">Crear</option>
                  <option value="actualizar_registro">Actualizar</option>
                  <option value="eliminar_registro">Eliminar</option>
                  <option value="cambio_contrasena">Cambiar Contraseña</option>
                  <option value="exportar_datos">Exportar</option>
                  <option value="importar_datos">Importar</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Severidad</label>
                <select
                  value={filters.severity}
                  onChange={e => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">Todas</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Estado</label>
                <select
                  value={filters.status}
                  onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">Todos</option>
                  <option value="success">Éxito</option>
                  <option value="error">Error</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Usuario</label>
                <input
                  type="text"
                  value={filters.userEmail}
                  onChange={e => { setFilters(f => ({ ...f, userEmail: e.target.value })); setPage(1); }}
                  placeholder="email@ejemplo.com"
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Desde</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Hasta</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Buscar</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                  placeholder="Buscar en logs..."
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Fecha</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Usuario</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Acción</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Módulo</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Estado</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Cargando registros...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No hay registros con los filtros seleccionados</td></tr>
                  ) : (
                    logs.map(log => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap", color: "#64748b", fontSize: 12 }}>
                          {new Date(log.created_at).toLocaleString("es-CO")}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{log.user_name || "Sistema"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.user_email}</div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ marginRight: 6 }}>{actionIcon(log.action)}</span>
                          <span style={{ fontWeight: 500 }}>{log.action}</span>
                          {log.severity !== "info" && (
                            <span style={{
                              marginLeft: 8, padding: "1px 6px", borderRadius: 4,
                              fontSize: 10, fontWeight: 700, color: "white",
                              background: severityColor(log.severity),
                            }}>
                              {log.severity.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            padding: "2px 8px", background: "#f1f5f9", borderRadius: 4,
                            fontSize: 11, fontWeight: 600, color: "#475569",
                          }}>
                            {log.module}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            color: "white", background: statusColor(log.status),
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>
                          {log.ip_address || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                borderTop: "1px solid #e2e8f0", background: "#f8fafc",
              }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  Página {page} de {totalPages} · {totalLogs} registros
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6,
                      background: page === 1 ? "#f1f5f9" : "white", cursor: page === 1 ? "not-allowed" : "pointer",
                      fontSize: 13, color: page === 1 ? "#94a3b8" : "#475569",
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6,
                      background: page === totalPages ? "#f1f5f9" : "white", cursor: page === totalPages ? "not-allowed" : "pointer",
                      fontSize: 13, color: page === totalPages ? "#94a3b8" : "#475569",
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Log Detail Modal */}
          {selectedLog && (
            <div
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
              }}
              onClick={() => setSelectedLog(null)}
            >
              <div
                style={{
                  background: "white", borderRadius: 16, padding: 24, maxWidth: 700,
                  width: "90%", maxHeight: "80vh", overflow: "auto",
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Detalle del Registro #{selectedLog.id}</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Fecha y Hora</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{new Date(selectedLog.created_at).toLocaleString("es-CO")}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Usuario</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.user_name} ({selectedLog.user_email})</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Rol</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.user_role}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>IP</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.ip_address || "N/A"}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Módulo</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.module}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Acción</label>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{actionIcon(selectedLog.action)} {selectedLog.action}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Estado</label>
                    <p style={{ margin: "4px 0" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                        color: "white", background: statusColor(selectedLog.status),
                      }}>
                        {selectedLog.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Severidad</label>
                    <p style={{ margin: "4px 0" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                        color: "white", background: severityColor(selectedLog.severity),
                      }}>
                        {selectedLog.severity}
                      </span>
                    </p>
                  </div>
                  {selectedLog.resource_type && (
                    <div>
                      <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Recurso</label>
                      <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.resource_type} #{selectedLog.resource_id}</p>
                    </div>
                  )}
                  {selectedLog.browser && (
                    <div>
                      <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Navegador</label>
                      <p style={{ margin: "4px 0", fontSize: 14 }}>{selectedLog.browser} / {selectedLog.os}</p>
                    </div>
                  )}
                </div>

                {selectedLog.old_value && (
                  <div style={{ marginTop: 16, padding: 12, background: "#fef2f2", borderRadius: 8 }}>
                    <label style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>Valor Anterior</label>
                    <pre style={{ margin: "4px 0 0", fontSize: 12, overflow: "auto", maxHeight: 100 }}>
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_value && (
                  <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", borderRadius: 8 }}>
                    <label style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Valor Nuevo</label>
                    <pre style={{ margin: "4px 0 0", fontSize: 12, overflow: "auto", maxHeight: 100 }}>
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div style={{ marginTop: 12, padding: 12, background: "#fef2f2", borderRadius: 8 }}>
                    <label style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>Error</label>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#dc2626" }}>{selectedLog.error_message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Estadísticas de Actividad</h2>
            <select
              value={daysRange}
              onChange={e => { setDaysRange(parseInt(e.target.value)); fetchStats(); }}
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </div>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>{stats?.total || 0}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total de Eventos</div>
            </div>
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>{stats?.errors || 0}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Errores</div>
            </div>
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f97316" }}>{stats?.failedLogins || 0}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Intentos Fallidos</div>
            </div>
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>
                {stats?.alerts?.reduce((sum, a) => sum + a.unresolved, 0) || 0}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Alertas Pendientes</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* By Module */}
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Por Módulo</h3>
              {(stats?.byModule || []).map(m => (
                <div key={m.module} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{m.module}</span>
                    <span>{m.count}</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                    <div style={{
                      width: `${(m.count / (stats?.total || 1)) * 100}%`,
                      height: "100%", background: "#3b82f6", borderRadius: 3,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* By Action */}
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Por Acción</h3>
              {(stats?.byAction || []).map(a => (
                <div key={a.action} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{actionIcon(a.action)} {a.action}</span>
                    <span>{a.count}</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                    <div style={{
                      width: `${(a.count / (stats?.total || 1)) * 100}%`,
                      height: "100%", background: "#10b981", borderRadius: 3,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Users */}
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Usuarios Más Activos</h3>
              {(stats?.topUsers || []).map((u, i) => (
                <div key={u.email} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: i === 0 ? "#3b82f6" : i === 1 ? "#8b5cf6" : "#64748b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 13, fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.email}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.count}</div>
                </div>
              ))}
            </div>

            {/* By Severity */}
            <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Por Severidad</h3>
              {(stats?.bySeverity || []).map(s => (
                <div key={s.severity} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: severityColor(s.severity),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{s.severity}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <>
          <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>Alertas de Seguridad</h2>
          {alerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p>No hay alertas de seguridad pendientes</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    padding: 16, background: "white", borderRadius: 12,
                    border: `1px solid ${alert.severity === "critical" ? "#fecaca" : "#fef3c7"}`,
                    borderLeft: `4px solid ${severityColor(alert.severity)}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                          color: "white", background: severityColor(alert.severity),
                        }}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {alert.alert_type}
                        </span>
                      </div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 15 }}>{alert.title}</h4>
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{alert.description}</p>
                      <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                        {alert.user_email && `Usuario: ${alert.user_email} · `}
                        {alert.ip_address && `IP: ${alert.ip_address} · `}
                        {new Date(alert.created_at).toLocaleString("es-CO")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      style={{
                        padding: "6px 12px", background: "#10b981", color: "white",
                        border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      ✓ Resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
