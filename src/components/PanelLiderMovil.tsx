"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { authHeadersWithJson } from "@/lib/api";

export default function PanelLiderMovil() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchResumen = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lideres/mi-resumen", { headers: authHeadersWithJson() });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      setMensaje({ type: "error", text: "Error de conexión al cargar su panel." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  const registrosFiltrados = (data?.registros || []).filter((r: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.nombre_completo?.toLowerCase().includes(s) ||
      r.id_unico?.toLowerCase().includes(s) ||
      r.telefono?.includes(s) ||
      r.barrio?.toLowerCase().includes(s) ||
      r.vereda?.toLowerCase().includes(s)
    );
  });

  const progreso = data?.progreso || { total: 0, porcentaje: 0, restantes: 50, urbanos: 0, rurales: 0 };
  const meta = data?.meta || 50;
  const lider = data?.lider || { nombre: "Líder" };
  const totalRegistros = data?.progreso?.total || 0;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {mensaje && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: mensaje.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${mensaje.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.type === "success" ? "#166534" : "#991b1b",
          fontSize: 14, fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{mensaje.text}</span>
          <button onClick={() => setMensaje(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Tarjeta de Bienvenida y Gamificación de Metas */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
        color: "white",
        borderRadius: 16,
        padding: "20px",
        boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 6 }}>
              Líder de Base Territorial
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 0 0" }}>{lider.nombre}</h2>
          </div>
          <div style={{ fontSize: 32 }}>🎯</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            <span>Tu Meta: {progreso.total} / {meta} votos</span>
            <span>{loading ? "..." : `${progreso.porcentaje}% alcanzado`}</span>
          </div>
          <div style={{ height: 12, background: "rgba(255, 255, 255, 0.25)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progreso.porcentaje}%`,
              background: "#22c55e",
              borderRadius: 6,
              transition: "width 0.5s ease"
            }} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span>🏙️ Urbanos: {progreso.urbanos} | 🌾 Rurales: {progreso.rurales}</span>
            <span>Faltan: <strong>{progreso.restantes}</strong></span>
          </div>
        </div>
      </div>

      {/* Acción principal: abre el módulo de formulario */}
      <Link
        href="/dashboard/formulario"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: "18px 20px",
          borderRadius: 14,
          background: "#16a34a",
          color: "white",
          textDecoration: "none",
          boxShadow: "0 8px 20px -8px rgba(22, 163, 74, 0.6)",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>➕ Registrar simpatizante</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
            Escanee la cédula y complete el formulario de registro
          </div>
        </div>
        <span style={{ fontSize: 22 }}>→</span>
      </Link>

      {data?.apoyos && data.apoyos.length > 0 && (
        <div style={{ background: "white", borderRadius: 12, padding: "16px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", margin: "0 0 10px 0" }}>
            🗳️ Votos Comprometidos con tu Fórmula
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.apoyos.map((a: any, idx: number) => (
              <div key={idx} style={{
                background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                fontSize: 12, display: "flex", alignItems: "center", gap: 6
              }}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{a.candidato_nombre}</span>
                {a.numero_tarjeton && <span style={{ color: "#4f46e5", fontWeight: 700 }}>#{a.numero_tarjeton}</span>}
                <span style={{ background: "#dcfce7", color: "#166534", fontWeight: 800, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                  {a.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listado compacto; la gestión completa vive en el módulo Registros */}
      <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#0f172a" }}>
              👥 Mis Simpatizantes ({totalRegistros})
            </h3>
            <Link href="/dashboard/registros" style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}>
              Gestionar →
            </Link>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, cédula o barrio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1",
              fontSize: 14, outline: "none"
            }}
          />
        </div>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "500px", overflowY: "auto" }}>
          {registrosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8", fontSize: 13 }}>
              {search
                ? "No se encontraron simpatizantes con ese criterio."
                : "Aún no has registrado simpatizantes. Usa 'Registrar simpatizante' para comenzar."}
            </div>
          ) : (
            registrosFiltrados.map((c: any) => {
              const cleanPhone = c.telefono ? c.telefono.replace(/\D/g, "") : "";
              const waLink = cleanPhone ? `https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(c.nombre_completo || "")}` : null;
              const telLink = cleanPhone ? `tel:${cleanPhone}` : null;

              return (
                <div key={c.id} style={{
                  padding: "14px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#f8fafc",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.nombre_completo}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                      <span>🪪 {c.id_unico}</span>
                      <span>📍 {c.barrio || c.vereda || "Sin territorio"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Enviar WhatsApp"
                        style={{
                          padding: "8px 10px", borderRadius: 8, background: "#22c55e", color: "white",
                          textDecoration: "none", fontSize: 14, fontWeight: 700
                        }}
                      >
                        💬
                      </a>
                    )}
                    {telLink && (
                      <a
                        href={telLink}
                        title="Llamar directo"
                        style={{
                          padding: "8px 10px", borderRadius: 8, background: "#3b82f6", color: "white",
                          textDecoration: "none", fontSize: 14, fontWeight: 700
                        }}
                      >
                        📞
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
