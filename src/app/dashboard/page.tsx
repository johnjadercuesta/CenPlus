"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MapaCalor from "@/components/MapaCalor";
import KPICard from "@/components/KPICard";
import type { Stats, SectorStat } from "@/types/ciudadano";
import { authHeaders } from "@/lib/api";


export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ciudadanos, setCiudadanos] = useState<{latitud: number | null; longitud: number | null; es_lider: boolean}[]>([]);
  const [sectores, setSectores] = useState<SectorStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = authHeaders();

    Promise.all([
      fetch("/api/stats", { headers, cache: "no-store" }).then((r) => r.json()),
      fetch("/api/ciudadanos/coords", { headers, cache: "no-store" }).then((r) => r.json()),
      fetch("/api/sectores/stats", { headers, cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, c, st]) => {
        setStats(s);
        setCiudadanos(c.data || []);
        setSectores(st.sectorStats || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="main-header">
          <div>
            <h1 className="main-header-title">Dashboard</h1>
            <p className="main-header-subtitle">Cargando métricas...</p>
          </div>
        </div>
      </div>
    );
  }

  const metaColor =
    (stats?.porcentajeMeta ?? 0) >= 80 ? "#2563eb" :
    (stats?.porcentajeMeta ?? 0) >= 30 ? "#f59e0b" : "#ef4444";

  const maxBarrio = Math.max(...(stats?.topBarrios.map((b) => b.c) || [1]));
  const max7dias = Math.max(...(stats?.ultimos7dias.map((d) => d.c) || [1]));

  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">Dashboard</h1>
          <p className="main-header-subtitle">Resumen general del censo comunitario</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard/formulario" className="btn btn-primary btn-sm">
            + Nuevo Registro
          </Link>
          <button
            onClick={async () => {
              const res = await fetch("/api/export");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `cenplus_${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-ghost btn-sm"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          <KPICard
            icon={<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />}
            iconExtra={<circle cx="8.5" cy="7" r="4" />}
            value={stats?.total || 0}
            label="Total Registrados"
            color="#2563eb"
            bgColor="#dbeafe"
            change={stats?.semana ? `+${stats.semana} esta semana` : undefined}
            changeUp
          />
          <KPICard
            icon={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
            value={stats?.lideres || 0}
            label="Líderes Comunitarios"
            color="#d97706"
            bgColor="#fef3c7"
          />
          <KPICard
            icon={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
            value={stats?.hoy || 0}
            label="Registros Hoy"
            color="#16a34a"
            bgColor="#dcfce7"
          />
          <KPICard
            icon={<><rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="21 15 16 10 5 21" /></>}
            value={stats?.conCoords || 0}
            label="Geolocalizados"
            color="#7c3aed"
            bgColor="#f3e8ff"
          />
          <KPICard
            icon={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
            value={`${stats?.avgEdad || 0}`}
            label="Edad Promedio"
            color="#0284c7"
            bgColor="#e0f2fe"
          />
        </div>

        {/* Row: Meta + Barras + Tendencias */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Meta progress */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Progreso de Meta</span>
              <span className="badge" style={{ background: metaColor + "18", color: metaColor }}>
                {(stats?.porcentajeMeta || 0).toFixed(1)}%
              </span>
            </div>
            <div className="card-body">
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: `conic-gradient(${metaColor} ${(stats?.porcentajeMeta || 0) * 3.6}deg, #f1f5f9 0deg)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}>
                  <div style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: metaColor, lineHeight: 1 }}>
                      {(stats?.porcentajeMeta || 0).toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>meta</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{stats?.total || 0} de {stats?.meta || 1000}</span>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94a3b8" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} /> &lt;30%
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94a3b8" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} /> 30-80%
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94a3b8" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} /> ≥80%
                </span>
              </div>
            </div>
          </div>

          {/* Bar chart 7 days - improved */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Actividad Últimos 7 Días</span>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, paddingBottom: 24 }}>
                {stats?.ultimos7dias.map((d, i) => {
                  const height = max7dias > 0 ? (d.c / max7dias) * 130 : 0;
                  const isToday = i === 6;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: d.c > 0 ? (isToday ? "#2563eb" : "#64748b") : "#cbd5e1",
                        marginBottom: 4,
                      }}>
                        {d.c}
                      </span>
                      <div style={{
                        width: "100%",
                        maxWidth: 40,
                        height: Math.max(height, 4),
                        borderRadius: "6px 6px 2px 2px",
                        background: d.c > 0
                          ? isToday
                            ? "linear-gradient(180deg, #3b82f6, #1d4ed8)"
                            : "linear-gradient(180deg, #94a3b8, #64748b)"
                          : "#f1f5f9",
                        transition: "height 0.5s ease",
                        boxShadow: d.c > 0 ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                      }} />
                      <span style={{
                        fontSize: 10,
                        color: isToday ? "#2563eb" : "#94a3b8",
                        marginTop: 6,
                        fontWeight: isToday ? 700 : 500,
                        textTransform: "capitalize",
                      }}>
                        {d.fecha}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Occupations */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Top Ocupaciones</span>
            </div>
            <div className="card-body" style={{ padding: "12px 20px" }}>
              {(stats?.topOcupaciones || []).slice(0, 6).map((o, i) => {
                const maxO = Math.max(...(stats?.topOcupaciones.map((x) => x.c) || [1]));
                const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#6366f1"];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: colors[i % colors.length] + "15",
                      color: colors[i % colors.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.ocupacion}
                    </span>
                    <div style={{ width: 50, height: 4, background: "#f1f5f9", borderRadius: 2, flexShrink: 0 }}>
                      <div style={{ width: `${(o.c / maxO) * 100}%`, height: "100%", background: colors[i % colors.length], borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length], minWidth: 20, textAlign: "right" }}>{o.c}</span>
                  </div>
                );
              })}
              {(!stats?.topOcupaciones || stats.topOcupaciones.length === 0) && (
                <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 20 }}>Sin datos</p>
              )}
            </div>
          </div>
        </div>

        {/* Sectores Progress */}
        {sectores.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Progreso por Sector</span>
              <Link href="/dashboard/sectores" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}>
                Gestionar sectores →
              </Link>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {sectores.map((s) => {
                  const color = s.porcentaje >= 80 ? "#2563eb" : s.porcentaje >= 30 ? "#f59e0b" : "#ef4444";
                  const bgLight = s.porcentaje >= 80 ? "#eff6ff" : s.porcentaje >= 30 ? "#fffbeb" : "#fef2f2";
                  return (
                    <div key={s.id} style={{
                      padding: 16,
                      borderRadius: 10,
                      background: bgLight,
                      border: `1px solid ${color}22`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{s.nombre}</span>
                        <span style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: color,
                        }}>
                          {(s.porcentaje || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: `${color}20`, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{
                          width: `${Math.min(s.porcentaje, 100)}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 3,
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {s.registros} de {s.meta} registros
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Row: Estudios + Sexo + Barrios */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Por Nivel de Estudios</span>
            </div>
            <div className="card-body" style={{ padding: "14px 20px" }}>
              {(stats?.porEstudios || []).map((e, i) => {
                const maxE = Math.max(...(stats?.porEstudios.map((x) => x.c) || [1]));
                const pct = maxE > 0 ? (e.c / maxE) * 100 : 0;
                const colors = ["#2563eb", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>{e.nivel_estudios}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length] }}>{e.c}</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: colors[i % colors.length], borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Distribución por Sexo</span>
            </div>
            <div className="card-body">
              {(stats?.porSexo || []).map((s, i) => {
                const total = (stats?.porSexo || []).reduce((a, b) => a + b.c, 0);
                const pct = total > 0 ? Math.round((s.c / total) * 100) : 0;
                const color = s.sexo === "Masculino" ? "#2563eb" : s.sexo === "Femenino" ? "#ec4899" : "#8b5cf6";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: `conic-gradient(${color} ${pct * 3.6}deg, #f1f5f9 0deg)`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%", background: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 13, color,
                      }}>
                        {pct}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{s.sexo}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{s.c} personas</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Top Barrios</span>
            </div>
            <div className="card-body" style={{ padding: "12px 20px" }}>
              {(stats?.topBarrios || []).slice(0, 6).map((b, i) => {
                const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#6366f1"];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1", width: 18, textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.barrio}</span>
                    <div style={{ width: 50, height: 4, background: "#f1f5f9", borderRadius: 2, flexShrink: 0 }}>
                      <div style={{ width: `${(b.c / maxBarrio) * 100}%`, height: "100%", background: colors[i % colors.length], borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length] }}>{b.c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Mapa Territorial</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {ciudadanos.filter((c) => c.latitud && c.longitud).length} puntos geolocalizados
            </span>
          </div>
          <div style={{ padding: 16 }}>
            <MapaCalor ciudadanos={ciudadanos.filter((c) => c.latitud && c.longitud)} meta={stats?.meta || 1000} />
          </div>
        </div>

        {/* Productividad por líder */}
        {stats?.porLider && stats.porLider.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>Productividad por Líder</span>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {stats.porLider.map((l, i) => (
                  <div key={i} style={{
                    padding: 18,
                    background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {l.nombre.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{l.nombre}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#1e3a5f", lineHeight: 1 }}>{l.c}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>registros creados</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

