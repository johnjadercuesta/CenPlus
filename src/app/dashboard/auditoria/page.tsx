"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: number;
  usuario_email: string;
  usuario_nombre: string;
  modulo: string;
  accion: string;
  created_at: string;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <div className="main-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="main-header-title">AuditorÃ­a del Sistema</h1>
          <p className="main-header-subtitle">Registro inalterable de actividad de usuarios</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>MÃ³dulo</th>
                <th>AcciÃ³n</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 40 }}>Cargando registros...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 40 }}>No hay registros de actividad aÃºn.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                      {new Date(log.created_at).toLocaleString('es-CO', { 
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.usuario_nombre}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.usuario_email}</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: "2px 8px", background: "#f1f5f9", borderRadius: 4, 
                        fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" 
                      }}>
                        {log.modulo}
                      </span>
                    </td>
                    <td style={{ maxWidth: 400, fontSize: 13 }}>{log.accion}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
