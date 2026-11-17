"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";

const CORPORACIONES = [
  { id: "alcaldia", label: "🏛️ Alcaldía", nivel: "Municipal" },
  { id: "concejo", label: "👥 Concejo", nivel: "Municipal" },
  { id: "gobernacion", label: "🏢 Gobernación", nivel: "Departamental" },
  { id: "asamblea", label: "📑 Asamblea", nivel: "Departamental" },
  { id: "senado", label: "🏛️ Senado", nivel: "Nacional" },
  { id: "camara", label: "🏛️ Cámara", nivel: "Departamental" },
  { id: "presidencia", label: "🇨🇴 Presidencia", nivel: "Nacional" },
  { id: "jal", label: "📍 JAL (Ediles)", nivel: "Local / Comunal" },
];

export default function GestionCandidatos() {
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario nuevo candidato
  const [form, setForm] = useState({
    nombre: "",
    corporacion: "alcaldia",
    numero_tarjeton: "",
    partido: "",
  });

  // Filtros y Cruce de cuentas
  const [corpFiltro, setCorpFiltro] = useState<string>("todas");
  const [matrizBase, setMatrizBase] = useState<string>("concejo");
  const [matrizMeta, setMatrizMeta] = useState<string>("alcaldia");
  const [matrizData, setMatrizData] = useState<any[]>([]);
  const [loadingMatriz, setLoadingMatriz] = useState(false);

  const fetchCandidatos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/candidatos", { headers: authHeadersWithJson() });
      const json = await res.json();
      if (res.ok) setCandidatos(json.data || []);
    } catch {
      setMessage({ type: "error", text: "Error al cargar candidatos" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatrizCruce = async () => {
    try {
      setLoadingMatriz(true);
      const res = await fetch(`/api/apoyos/cruce?base=${matrizBase}&meta=${matrizMeta}`, {
        headers: authHeadersWithJson()
      });
      const json = await res.json();
      if (res.ok) setMatrizData(json.data || []);
    } catch {
      console.warn("Error cargando matriz de cruce");
    } finally {
      setLoadingMatriz(false);
    }
  };

  useEffect(() => {
    fetchCandidatos();
  }, []);

  useEffect(() => {
    fetchMatrizCruce();
  }, [matrizBase, matrizMeta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    try {
      const res = await fetch("/api/candidatos", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Candidato registrado exitosamente" });
        setForm({ nombre: "", corporacion: form.corporacion, numero_tarjeton: "", partido: "" });
        fetchCandidatos();
      } else {
        setMessage({ type: "error", text: json.error || "Error al registrar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de red" });
    }
  };

  const handleDesactivar = async (id: number) => {
    if (!confirm("¿Desea desactivar este candidato de la fórmula?")) return;
    try {
      const res = await fetch(`/api/candidatos/${id}`, {
        method: "DELETE",
        headers: authHeadersWithJson()
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Candidato desactivado" });
        fetchCandidatos();
      }
    } catch {
      setMessage({ type: "error", text: "Error al desactivar" });
    }
  };

  const candidatosFiltrados = corpFiltro === "todas" 
    ? candidatos 
    : candidatos.filter(c => c.corporacion === corpFiltro);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {message && (
        <div style={{
          padding: "12px 18px", borderRadius: 8,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#166534" : "#991b1b",
          fontSize: 14, fontWeight: 500, display: "flex", justifyContent: "space-between"
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Formulario de Alta y Configuración */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>➕ Registrar Candidato en la Alianza</h3>
        </div>
        <div className="card-body" style={{ padding: "20px" }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Corporación / Cargo *</label>
              <select
                value={form.corporacion}
                onChange={e => setForm({ ...form, corporacion: e.target.value })}
                className="input"
              >
                {CORPORACIONES.map(c => (
                  <option key={c.id} value={c.id}>{c.label} ({c.nivel})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Nombre del Candidato *</label>
              <input
                type="text"
                placeholder="Ej. Juan Carlos Pérez"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
                className="input"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>N° Tarjetón (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. 101"
                value={form.numero_tarjeton}
                onChange={e => setForm({ ...form, numero_tarjeton: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Partido o Movimiento</label>
              <input
                type="text"
                placeholder="Ej. Coalición de la Esperanza"
                value={form.partido}
                onChange={e => setForm({ ...form, partido: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700 }}>
                Guardar Candidato
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Grid de Candidatos y Apoyos */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>👥 Candidatos de la Campaña</h3>
            <span style={{ fontSize: 12, color: "#64748b" }}>{candidatos.length} candidatos activos en la fórmula</span>
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            <button
              onClick={() => setCorpFiltro("todas")}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #cbd5e1",
                background: corpFiltro === "todas" ? "#4f46e5" : "white", color: corpFiltro === "todas" ? "white" : "#475569",
                cursor: "pointer"
              }}
            >
              Todos
            </button>
            {CORPORACIONES.map(c => (
              <button
                key={c.id}
                onClick={() => setCorpFiltro(c.id)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #cbd5e1",
                  background: corpFiltro === c.id ? "#4f46e5" : "white", color: corpFiltro === c.id ? "white" : "#475569",
                  cursor: "pointer"
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body" style={{ padding: "20px" }}>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Cargando candidatos...</p>
          ) : candidatosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
              No hay candidatos registrados en esta categoría.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {candidatosFiltrados.map(c => (
                <div key={c.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", background: "white", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "#f1f5f9", color: "#475569", textTransform: "uppercase" }}>
                        {c.corporacion}
                      </span>
                      {c.numero_tarjeton && (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#4f46e5" }}>
                          #{c.numero_tarjeton}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDesactivar(c.id)}
                      title="Desactivar"
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}
                    >
                      🗑️
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{c.nombre}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{c.partido || "Sin partido especificado"}</div>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Votos Comprometidos:</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>
                      {c.total_apoyos || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Matriz de Cruce de Cuentas / Co-Votación */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📊 Matriz de Cruce de Votos (Co-Votación)</h3>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Verifica cuántos electores de cada candidato base apoyan a la corporación aliada
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Cruzar:</span>
              <select
                value={matrizBase}
                onChange={e => setMatrizBase(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
              >
                {CORPORACIONES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>➔</span>
              <select
                value={matrizMeta}
                onChange={e => setMatrizMeta(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
              >
                {CORPORACIONES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: "20px" }}>
          {loadingMatriz ? (
            <p style={{ color: "#94a3b8" }}>Calculando correlación de votos...</p>
          ) : matrizData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
              No se han registrado simpatizantes con votos coincidentes entre {matrizBase.toUpperCase()} y {matrizMeta.toUpperCase()} todavía.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 14px", color: "#475569", fontWeight: 700 }}>Candidato Base ({matrizBase.toUpperCase()})</th>
                    <th style={{ padding: "12px 14px", color: "#475569", fontWeight: 700 }}>Candidato Respaldado ({matrizMeta.toUpperCase()})</th>
                    <th style={{ padding: "12px 14px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Electores Coincidentes</th>
                  </tr>
                </thead>
                <tbody>
                  {matrizData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>
                        {row.base_nombre} {row.base_tarjeton ? `(#${row.base_tarjeton})` : ""}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 4, background: "#eef2ff", color: "#4338ca", fontWeight: 600, fontSize: 12 }}>
                          {row.meta_nombre}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#16a34a", fontSize: 15 }}>
                        {row.votos_coincidentes} votos
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #6366f1;
        }
      `}</style>
    </div>
  );
}
