"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";

type Escala = "nacional" | "departamental" | "municipal";

export default function DashboardMultinivel() {
  const [escala, setEscala] = useState<Escala>("municipal");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async (esc: Escala) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/estadisticas/multinivel?escala=${esc}`, {
        headers: authHeadersWithJson()
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      console.warn("Error cargando estadísticas multinivel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(escala);
  }, [escala]);

  const handleCambioEscala = (nuevaEscala: Escala) => {
    setEscala(nuevaEscala);
    setSearch("");
  };

  const listaFiltrada = (data?.data || []).filter((item: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const nombre = item.territorio || item.municipio || item.nombre || "";
    return nombre.toLowerCase().includes(s);
  });

  const total = data?.total || 0;
  const meta = data?.meta_global || 1000;
  const porcentaje = Math.min(100, Math.round((total / meta) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Selector de Escala de Campaña */}
      <div style={{
        background: "white", padding: "16px", borderRadius: 14, border: "1px solid #e2e8f0",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Ámbito de Elección Activo
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 0 0", color: "#0f172a" }}>
            {escala === "nacional" ? "🇨🇴 Nivel Nacional (Presidencia / Senado)" :
             escala === "departamental" ? "🏢 Nivel Departamental (Gobernación / Cámara / Asamblea)" :
             "🏛️ Nivel Municipal (Alcaldía / Concejo / JAL)"}
          </h2>
        </div>

        <div style={{ display: "flex", gap: 8, background: "#f1f5f9", padding: "4px", borderRadius: 10 }}>
          <button
            onClick={() => handleCambioEscala("nacional")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s ease",
              background: escala === "nacional" ? "#4f46e5" : "transparent",
              color: escala === "nacional" ? "white" : "#475569"
            }}
          >
            🇨🇴 Presidencia / Senado
          </button>
          <button
            onClick={() => handleCambioEscala("departamental")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s ease",
              background: escala === "departamental" ? "#4f46e5" : "transparent",
              color: escala === "departamental" ? "white" : "#475569"
            }}
          >
            🏢 Gobernación / Cámara
          </button>
          <button
            onClick={() => handleCambioEscala("municipal")}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s ease",
              background: escala === "municipal" ? "#4f46e5" : "transparent",
              color: escala === "municipal" ? "white" : "#475569"
            }}
          >
            🏛️ Alcaldía / Concejo
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de la Escala */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ background: "white", padding: "18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Electores Fidelizados</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginTop: 4 }}>
            {porcentaje}% de la meta ({meta.toLocaleString()} votos)
          </div>
        </div>

        <div style={{ background: "white", padding: "18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
            {escala === "nacional" ? "Departamentos Cubiertos" :
             escala === "departamental" ? "Municipios Activos" :
             "Comunas y Corregimientos"}
          </span>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#4f46e5", marginTop: 6 }}>
            {escala === "nacional" ? `${data?.cobertura_deptos || 0} / 33` :
             escala === "departamental" ? `${data?.total_municipios || 0} municipios` :
             `${data?.comunas_corregimientos || 0} zonas`}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Presencia en territorio
          </div>
        </div>

        <div style={{ background: "white", padding: "18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Territorio Líder en Votación</span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {data?.departamento_lider || data?.municipio_lider || (data?.data?.[0]?.nombre) || "Sin datos"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Mayor concentración de apoyos
          </div>
        </div>

        <div style={{ background: "white", padding: "18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Fórmula Política Vinculada</span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", marginTop: 6 }}>
            {escala === "nacional" ? "Senado + Presidencia" :
             escala === "departamental" ? "Cámara + Gobernación" :
             "Alcaldía + Concejo"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Elecciones vinculadas
          </div>
        </div>
      </div>

      {/* Tabla y Desglose por Territorio */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {escala === "nacional" ? "🇨🇴 Desglose por Departamentos de Colombia" :
               escala === "departamental" ? "🏢 Desglose por Municipios" :
               "🏛️ Desglose por Comunas, Corregimientos y Veredas"}
            </h3>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Mostrando {listaFiltrada.length} territorios
            </span>
          </div>

          <input
            type="text"
            placeholder="🔍 Filtrar territorio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" }}
          />
        </div>

        <div className="card-body" style={{ padding: "0" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Cargando desglose territorial...</div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No se encontraron territorios.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 18px", color: "#475569", fontWeight: 700 }}>Territorio</th>
                    {escala === "municipal" && (
                      <th style={{ padding: "12px 18px", color: "#475569", fontWeight: 700 }}>Tipo / Jurisdicción</th>
                    )}
                    <th style={{ padding: "12px 18px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Votos Comprometidos</th>
                    <th style={{ padding: "12px 18px", color: "#475569", fontWeight: 700, textAlign: "right" }}>% Aporte</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((item: any, idx: number) => {
                    const nombre = item.territorio || item.municipio || item.nombre;
                    const votos = item.total_ciudadanos !== undefined ? item.total_ciudadanos : (item.electores || 0);
                    const pctAporte = total > 0 ? Math.round((votos / total) * 100) : 0;

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 18px", fontWeight: 600, color: "#0f172a" }}>
                          {nombre}
                          {item.padre_nombre && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8" }}>
                              (en {item.padre_nombre})
                            </span>
                          )}
                        </td>
                        {escala === "municipal" && (
                          <td style={{ padding: "14px 18px", color: "#64748b" }}>
                            <span style={{
                              padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                              background: item.zona === "rural" ? "#fef3c7" : "#e0e7ff",
                              color: item.zona === "rural" ? "#92400e" : "#3730a3"
                            }}>
                              {item.tipo} ({item.zona})
                            </span>
                          </td>
                        )}
                        <td style={{ padding: "14px 18px", textAlign: "right", fontWeight: 800, color: votos > 0 ? "#16a34a" : "#94a3b8" }}>
                          {votos.toLocaleString()}
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>
                          {pctAporte}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
