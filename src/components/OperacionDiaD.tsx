"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";

export default function OperacionDiaD() {
  const [tab, setTab] = useState<"preconteo" | "mesas" | "transmitir">("preconteo");
  const [preconteo, setPreconteo] = useState<any>(null);
  const [mesas, setMesas] = useState<any[]>([]);
  const [lideres, setLideres] = useState<any[]>([]);
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario de Transmisión E-14
  const [selectedMesaId, setSelectedMesaId] = useState<string>("");
  const [votosInput, setVotosInput] = useState<{ [candidatoId: number]: string }>({});
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [enviandoE14, setEnviandoE14] = useState(false);

  const fetchPreconteo = async () => {
    try {
      const res = await fetch("/api/dia-d/preconteo", { headers: authHeadersWithJson() });
      const json = await res.json();
      if (res.ok) setPreconteo(json);
    } catch {
      console.warn("Error cargando preconteo");
    }
  };

  const fetchMesas = async () => {
    try {
      const res = await fetch("/api/dia-d/mesas", { headers: authHeadersWithJson() });
      const json = await res.json();
      if (res.ok) setMesas(json.data || []);
    } catch {
      console.warn("Error cargando mesas");
    }
  };

  const fetchAuxiliares = async () => {
    try {
      const [rLideres, rCands] = await Promise.all([
        fetch("/api/lideres", { headers: authHeadersWithJson() }).then(r => r.json()),
        fetch("/api/candidatos", { headers: authHeadersWithJson() }).then(r => r.json())
      ]);
      if (rLideres.data) setLideres(rLideres.data);
      if (rCands.data) setCandidatos(rCands.data);
    } catch {
      console.warn("Error cargando auxiliares");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPreconteo(), fetchMesas(), fetchAuxiliares()]).finally(() => setLoading(false));

    // Polling ligero para preconteo en vivo (cada 15 segundos)
    const interval = setInterval(fetchPreconteo, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAsignarTestigo = async (mesaId: number, testigoId: string) => {
    try {
      const res = await fetch("/api/dia-d/asignar-testigo", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify({ mesa_id: mesaId, testigo_id: testigoId || null })
      });
      if (res.ok) {
        setMensaje({ type: "success", text: "Testigo asignado correctamente" });
        fetchMesas();
      }
    } catch {
      setMensaje({ type: "error", text: "Error al asignar testigo" });
    }
  };

  const handleTransmitirE14 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMesaId) {
      setMensaje({ type: "error", text: "Debe seleccionar una mesa de votación" });
      return;
    }

    const votosArray = Object.entries(votosInput).map(([cId, v]) => ({
      candidato_id: parseInt(cId),
      votos: parseInt(v) || 0
    }));

    if (votosArray.length === 0) {
      setMensaje({ type: "error", text: "Debe registrar los votos de al menos un candidato" });
      return;
    }

    try {
      setEnviandoE14(true);
      const res = await fetch("/api/dia-d/reportar-e14", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify({
          mesa_id: selectedMesaId,
          votos_candidatos: votosArray,
          foto_e14_url: fotoUrl,
          observaciones
        })
      });
      const json = await res.json();
      if (res.ok) {
        setMensaje({ type: "success", text: "✅ Acta E-14 transmitida y escrutada exitosamente" });
        setSelectedMesaId("");
        setVotosInput({});
        setFotoUrl("");
        setObservaciones("");
        fetchPreconteo();
        fetchMesas();
        setTab("preconteo");
      } else {
        setMensaje({ type: "error", text: json.error || "Error al transmitir acta" });
      }
    } catch {
      setMensaje({ type: "error", text: "Error de red al transmitir acta" });
    } finally {
      setEnviandoE14(false);
    }
  };

  const resumenMesas = preconteo?.resumen_mesas || { total_mesas: 0, mesas_escrutadas: 0, porcentaje_escrutado: 0 };
  const resultados = preconteo?.resultados || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Alertas */}
      {mensaje && (
        <div style={{
          padding: "12px 18px", borderRadius: 8,
          background: mensaje.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${mensaje.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.type === "success" ? "#166534" : "#991b1b",
          fontSize: 14, fontWeight: 500, display: "flex", justifyContent: "space-between"
        }}>
          <span>{mensaje.text}</span>
          <button onClick={() => setMensaje(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Pestañas de Navegación del Día D */}
      <div style={{ display: "flex", gap: 8, background: "#f1f5f9", padding: "6px", borderRadius: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setTab("preconteo")}
          style={{
            flex: 1, minWidth: "160px", padding: "10px", borderRadius: 8, border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            background: tab === "preconteo" ? "#4f46e5" : "transparent",
            color: tab === "preconteo" ? "white" : "#475569"
          }}
        >
          📊 Preconteo en Vivo E-14
        </button>
        <button
          onClick={() => setTab("transmitir")}
          style={{
            flex: 1, minWidth: "160px", padding: "10px", borderRadius: 8, border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            background: tab === "transmitir" ? "#16a34a" : "transparent",
            color: tab === "transmitir" ? "white" : "#475569"
          }}
        >
          📝 Transmitir Acta E-14 (Testigo)
        </button>
        <button
          onClick={() => setTab("mesas")}
          style={{
            flex: 1, minWidth: "160px", padding: "10px", borderRadius: 8, border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            background: tab === "mesas" ? "#4f46e5" : "transparent",
            color: tab === "mesas" ? "white" : "#475569"
          }}
        >
          👥 Red de Testigos por Mesa ({mesas.length})
        </button>
      </div>

      {/* TAB 1: PRECONTEO EN VIVO */}
      {tab === "preconteo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Termómetro de Escrutinio */}
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            color: "white", padding: "20px", borderRadius: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 6 }}>
                  Preconteo Oficial Alianza
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 0 0" }}>
                  {resumenMesas.mesas_escrutadas} de {resumenMesas.total_mesas} mesas reportadas ({resumenMesas.porcentaje_escrutado}%)
                </h2>
              </div>
              <div style={{ fontSize: 28 }}>🗳️</div>
            </div>

            <div style={{ height: 12, background: "rgba(255, 255, 255, 0.2)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${resumenMesas.porcentaje_escrutado}%`,
                background: "#22c55e", borderRadius: 6, transition: "width 0.5s ease"
              }} />
            </div>

            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span>Censo electoral estimado: {(resumenMesas.censo_total || 0).toLocaleString()} votantes</span>
              <span>Mesas con testigo asignado: {resumenMesas.mesas_con_testigo}</span>
            </div>
          </div>

          {/* Votos por Candidato de la Fórmula */}
          <div className="card">
            <div className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🏆 Resultados Consolidados por Candidatura</h3>
            </div>
            <div className="card-body" style={{ padding: "20px" }}>
              {resultados.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center" }}>No hay actas E-14 registradas todavía.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {resultados.map((c: any) => (
                    <div key={c.id} style={{
                      padding: "16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "white",
                      display: "flex", flexDirection: "column", gap: 8
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", color: "#475569", textTransform: "uppercase" }}>
                          {c.corporacion}
                        </span>
                        {c.numero_tarjeton && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>#{c.numero_tarjeton}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{c.partido}</div>
                      
                      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{c.actas_recibidas} actas</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>
                          {c.votos_preconteo.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>votos</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSMISIÓN E-14 */}
      {tab === "transmitir" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
          <div className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📝 Transmisión de Preconteo Acta E-14</h3>
            <span style={{ fontSize: 12, color: "#64748b" }}>Un solo testigo transmite los votos para todos los candidatos de la fórmula</span>
          </div>
          <div className="card-body" style={{ padding: "20px" }}>
            <form onSubmit={handleTransmitirE14} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Seleccione Mesa de Votación *
                </label>
                <select
                  required
                  value={selectedMesaId}
                  onChange={e => setSelectedMesaId(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                >
                  <option value="">Seleccionar mesa...</option>
                  {mesas.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre_puesto} — Mesa #{m.numero_mesa} ({m.estado === 'finalizada' ? '✓ Ya reportada' : 'Pendiente'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Conteo de votos por cada candidato de la alianza */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                  Votos Obtenidos según Acta E-14:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {candidatos.map(cand => (
                    <div key={cand.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0"
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                          {cand.nombre} {cand.numero_tarjeton ? `(#${cand.numero_tarjeton})` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>{cand.corporacion}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={votosInput[cand.id] || ""}
                        onChange={e => setVotosInput({ ...votosInput, [cand.id]: e.target.value })}
                        style={{ width: "90px", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", textAlign: "right", fontWeight: 700, fontSize: 16 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Foto del Acta E-14 (URL o Evidencia Opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/foto-e14.jpg"
                  value={fotoUrl}
                  onChange={e => setFotoUrl(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Observaciones / Incidencias en la Mesa
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Reconteo de votos nulos solicitado sin objeciones..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
              </div>

              <button
                type="submit"
                disabled={enviandoE14}
                style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "none",
                  background: "#16a34a", color: "white", fontSize: 15, fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {enviandoE14 ? "Transmitiendo..." : "📤 TRANSMITIR PRECONTEO OFICIAL"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: RED DE TESTIGOS ELECTORALES */}
      {tab === "mesas" && (
        <div className="card">
          <div className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📍 Acreditación de Testigos por Mesa</h3>
            <span style={{ fontSize: 12, color: "#64748b" }}>Asigne un testigo para garantizar la cobertura total de puestos</span>
          </div>
          <div className="card-body" style={{ padding: "0" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", color: "#475569" }}>Puesto de Votación</th>
                    <th style={{ padding: "12px 16px", color: "#475569" }}>Mesa</th>
                    <th style={{ padding: "12px 16px", color: "#475569" }}>Estado Escrutinio</th>
                    <th style={{ padding: "12px 16px", color: "#475569" }}>Testigo Asignado</th>
                  </tr>
                </thead>
                <tbody>
                  {mesas.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>
                        {m.nombre_puesto}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                        Mesa #{m.numero_mesa}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: m.estado === "finalizada" ? "#dcfce7" : "#fef3c7",
                          color: m.estado === "finalizada" ? "#166534" : "#92400e"
                        }}>
                          {m.estado === "finalizada" ? "✓ Reportada" : "⏳ Pendiente"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          value={m.testigo_id || ""}
                          onChange={e => handleAsignarTestigo(m.id, e.target.value)}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                        >
                          <option value="">Sin testigo asignado</option>
                          {lideres.map(l => (
                            <option key={l.id} value={l.id}>{l.nombre} ({l.role})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
