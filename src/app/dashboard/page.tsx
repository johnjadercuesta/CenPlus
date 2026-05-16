"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MapaCalor from "@/components/MapaCalor";
import KPICard from "@/components/KPICard";
import ArchivoSelector from "@/components/ArchivoSelector";
import type { Stats, SectorStat } from "@/types/ciudadano";
import { authHeaders } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ciudadanos, setCiudadanos] = useState<{latitud: number | null; longitud: number | null; es_lider: boolean; problematica_principal?: string}[]>([]);
  const [sectores, setSectores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivoId, setArchivoId] = useState(() => localStorage.getItem("archivoSeleccionado") || "actual");

  useEffect(() => {
    const headers = authHeaders();
    const params = archivoId !== "actual" ? `?archivo_id=${archivoId}` : "";

    Promise.all([
      fetch(`/api/stats${params}`, { headers, cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/ciudadanos/coords${params}`, { headers, cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/sectores/stats${params}`, { headers, cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, c, st]) => {
        setStats(s);
        setCiudadanos(c.data || []);
        setSectores(st.sectorStats || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [archivoId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ borderTopColor: "#3b82f6", marginBottom: 12 }}></div>
          <p style={{ color: "#64748b", fontWeight: 500 }}>Cargando Inteligencia Territorial...</p>
        </div>
      </div>
    );
  }

  // LÃ³gica de Alertas
  const alertas = [];
  if (stats && stats.porcentajeMeta < 20) {
    alertas.push({ type: "critical", msg: "Bajo cumplimiento de meta global territorial." });
  }
  
  const sectoresCriticos = sectores.filter(s => s.porcentaje < 30);
  if (sectoresCriticos.length > 3) {
    alertas.push({ type: "warning", msg: `${sectoresCriticos.length} sectores en estado crÃ­tico de captaciÃ³n.` });
  }

  const problematicaUrgente = stats?.topProblematicas?.[0];
  if (problematicaUrgente && (problematicaUrgente.c / (stats?.total || 1)) > 0.4) {
    alertas.push({ type: "info", msg: `Alerta social: '${problematicaUrgente.problematica}' es la problemÃ¡tica dominante (>40%).` });
  }

  return (
    <div>
      <div className="main-header" style={{ paddingBottom: 20 }}>
        <div>
          <h1 className="main-header-title">Inteligencia Territorial</h1>
          <p className="main-header-subtitle">AnÃ¡lisis geoespacial y estratÃ©gico multi-capa</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ArchivoSelector value={archivoId} onChange={setArchivoId} compact />
          <Link href="/dashboard/formulario" className="btn btn-primary btn-sm">
            + Nuevo Registro Territorial
          </Link>
          <button
            onClick={async () => {
              const res = await fetch("/api/export");
              const content = await res.text();
              const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `cenplus_territorial_${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-ghost btn-sm"
          >
            Exportar Dataset
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Alertas Tempranas */}
        {alertas.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {alertas.map((a, i) => (
              <div key={i} style={{
                flex: 1, padding: "12px 16px", borderRadius: 10,
                background: a.type === "critical" ? "#fef2f2" : a.type === "warning" ? "#fffbeb" : "#eff6ff",
                border: `1px solid ${a.type === "critical" ? "#fecaca" : a.type === "warning" ? "#fef3c7" : "#dbeafe"}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>{a.type === "critical" ? "ðŸš¨" : a.type === "warning" ? "âš ï¸" : "â„¹ï¸"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: a.type === "critical" ? "#991b1b" : a.type === "warning" ? "#92400e" : "#1e40af" }}>
                  {a.msg}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Global KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          <KPICard
            icon={<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />}
            iconExtra={<circle cx="8.5" cy="7" r="4" />}
            value={stats?.total || 0}
            label="Base de Apoyos"
            color="#3b82f6"
            bgColor="#eff6ff"
            change={stats?.semana ? `+${stats.semana} Ãºltimos 7d` : undefined}
            changeUp
          />
          <KPICard
            icon={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
            value={stats?.lideres || 0}
            label="Estructura LÃ­deres"
            color="#f59e0b"
            bgColor="#fffbeb"
          />
          <KPICard
            icon={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
            value={stats?.hoy || 0}
            label="Registros Hoy"
            color="#10b981"
            bgColor="#ecfdf5"
          />
          <KPICard
            icon={<circle cx="12" cy="12" r="10" />}
            value={`${stats?.porcentajeMeta || 0}%`}
            label="Alcance Meta"
            color="#8b5cf6"
            bgColor="#f5f3ff"
          />
          <KPICard
            icon={<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />}
            value={stats?.conCoords || 0}
            label="GeolocalizaciÃ³n Ok"
            color="#ec4899"
            bgColor="#fdf2f8"
          />
        </div>

        {/* Strategic Analysis Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Geospace Analysis Map */}
          <div className="card">
            <div className="card-header">
              <div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>AnÃ¡lisis de Capas Espaciales</span>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Cruce de apoyos vs problemÃ¡ticas por zona</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 16 }}>
              <MapaCalor ciudadanos={ciudadanos} meta={stats?.meta || 1000} />
            </div>
          </div>

          {/* Strategic Gap (AnÃ¡lisis de Brecha) */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Brecha EstratÃ©gica (Meta vs Real)</span>
            </div>
            <div className="card-body" style={{ padding: "0 20px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sectores.slice(0, 6).map((s, i) => {
                  const brechaPct = s.votosHistoricos > 0 ? Math.round((s.registros / s.votosHistoricos) * 100) : 0;
                  return (
                    <div key={i} style={{ padding: "12px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{s.nombre}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: brechaPct >= 80 ? "#16a34a" : "#dc2626" }}>
                          {brechaPct}%
                        </span>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ 
                          width: `${Math.min(brechaPct, 100)}%`, 
                          height: "100%", 
                          background: brechaPct >= 80 ? "#16a34a" : brechaPct >= 30 ? "#f59e0b" : "#ef4444",
                          borderRadius: 4,
                          transition: "width 1s ease"
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                        <span>Real: {s.registros}</span>
                        <span>Meta HistÃ³rica: {s.votosHistoricos}</span>
                        <span style={{ fontWeight: 600, color: "#475569" }}>Faltan: {s.brecha}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/dashboard/sectores" style={{ 
                display: "block", textAlign: "center", marginTop: 16, fontSize: 12, 
                color: "#3b82f6", fontWeight: 700, textDecoration: "none" 
              }}>
                Ver todos los sectores â†’
              </Link>
            </div>
          </div>
        </div>

        {/* Health and Problems Analysis Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Social Problems */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 15 }}>ProblemÃ¡ticas Sociales DiagnÃ³stico</span>
            </div>
            <div className="card-body">
              {(stats?.topProblematicas || []).map((p, i) => {
                const maxP = stats?.topProblematicas ? Math.max(...stats.topProblematicas.map(x => x.c)) : 1;
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{p.problematica}</span>
                      <span style={{ fontWeight: 700 }}>{p.c} casos</span>
                    </div>
                    <div style={{ height: 6, background: "#f8fafc", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ 
                        width: `${(p.c / maxP) * 100}%`, 
                        height: "100%", 
                        background: i === 0 ? "#ef4444" : "#94a3b8", 
                        borderRadius: 3 
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health Distribution */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 15 }}>RÃ©gimen de Salud (Cobertura)</span>
            </div>
            <div className="card-body">
              {(stats?.topRegimenSalud || []).map((r, i) => {
                const total = stats?.total || 1;
                const pct = Math.round((r.c / total) * 100);
                const color = r.regimen_salud === "Contributivo" ? "#3b82f6" : r.regimen_salud === "Subsidiado" ? "#10b981" : "#f59e0b";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: `conic-gradient(${color} ${pct * 3.6}deg, #f1f5f9 0deg)`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color }}>
                        {pct}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{r.regimen_salud}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{r.c} personas registradas</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Educational Profile */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 15 }}>Perfil Educativo General</span>
            </div>
            <div className="card-body">
              {(stats?.porEstudios || []).map((e, i) => {
                const maxE = stats?.porEstudios ? Math.max(...stats.porEstudios.map(x => x.c)) : 1;
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{e.nivel_estudios}</span>
                      <span style={{ fontWeight: 700 }}>{e.c}</span>
                    </div>
                    <div style={{ height: 5, background: "#f1f5f9", borderRadius: 2 }}>
                      <div style={{ width: `${(e.c / maxE) * 100}%`, height: "100%", background: "#6366f1", borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Efficiency Analysis */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 15 }}>Eficiencia Operativa (Ãšltimos 7 DÃ­as)</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Tasa de recolecciÃ³n diaria</span>
          </div>
          <div className="card-body">
             <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160, paddingBottom: 24 }}>
                {(stats?.ultimos7dias || []).map((d, i) => {
                  const max7d = stats?.ultimos7dias?.length ? Math.max(...stats.ultimos7dias.map(x => x.c)) : 1;
                  const height = (d.c / (max7d || 1)) * 130;
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.c > 0 ? (isToday ? "#3b82f6" : "#64748b") : "#cbd5e1", marginBottom: 4 }}>{d.c}</span>
                      <div style={{ 
                        width: "100%", maxWidth: 50, height: Math.max(height, 4), 
                        background: d.c > 0 ? (isToday ? "linear-gradient(180deg, #3b82f6, #1d4ed8)" : "#94a3b8") : "#f1f5f9",
                        borderRadius: "4px 4px 1px 1px", transition: "height 0.8s ease"
                      }} />
                      <span style={{ fontSize: 10, color: isToday ? "#3b82f6" : "#94a3b8", marginTop: 6, fontWeight: isToday ? 800 : 500 }}>{d.fecha}</span>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .card { background: white; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; overflow: hidden; }
        .card-header { padding: 20px 24px; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; }
        .card-body { padding: 24px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .main-content { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}

