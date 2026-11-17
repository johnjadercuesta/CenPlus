"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { authHeadersWithJson } from "@/lib/api";

export default function PanelLiderMovil() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCiudadano, setEditingCiudadano] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ nombre_completo: "", telefono: "", barrio: "" });
  const [savingEdit, setSavingEdit] = useState(false);
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

  const handleOpenEdit = (c: any) => {
    setEditingCiudadano(c);
    setEditForm({
      nombre_completo: c.nombre_completo || "",
      telefono: c.telefono || "",
      barrio: c.barrio || c.vereda || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCiudadano) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/ciudadanos/${editingCiudadano.id}`, {
        method: "PUT",
        headers: authHeadersWithJson(),
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (res.ok) {
        setMensaje({ type: "success", text: "Registro actualizado correctamente." });
        setEditingCiudadano(null);
        fetchResumen();
      } else {
        setMensaje({ type: "error", text: json.error || "No se pudo actualizar." });
      }
    } catch {
      setMensaje({ type: "error", text: "Error de conexión al actualizar." });
    } finally {
      setSavingEdit(false);
    }
  };

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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📱</div>
        <p style={{ fontWeight: 600 }}>Cargando su panel territorial...</p>
      </div>
    );
  }

  const progreso = data?.progreso || { total: 0, porcentaje: 0, restantes: 50, urbanos: 0, rurales: 0 };
  const meta = data?.meta || 50;
  const lider = data?.lider || { nombre: "Líder" };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Mensajes flotantes */}
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

        {/* Barra de progreso */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            <span>Tu Meta: {progreso.total} / {meta} votos</span>
            <span>{progreso.porcentaje}% alcanzado</span>
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

      {/* Botón Gigante de Acción Rápida para el Líder */}
      <Link
        href="/dashboard/formulario"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "16px",
          background: "#16a34a",
          color: "white",
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 16,
          textDecoration: "none",
          boxShadow: "0 6px 15px -3px rgba(22, 163, 74, 0.4)",
          transition: "transform 0.1s ease"
        }}
      >
        <span style={{ fontSize: 22 }}>➕</span>
        <span>REGISTRAR NUEVO SIMPATIZANTE</span>
      </Link>

      {/* Resumen de apoyos aportados a la fórmula */}
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

      {/* Lista de simpatizantes propios con buscador */}
      <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#0f172a" }}>
              👥 Mis Simpatizantes Registrados ({registrosFiltrados.length})
            </h3>
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
              {search ? "No se encontraron simpatizantes con ese criterio." : "Aún no has registrado simpatizantes. ¡Comienza hoy con el botón verde superior!"}
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

                  {/* Acciones directas (Llamar, WhatsApp, Editar) */}
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
                    <button
                      onClick={() => handleOpenEdit(c)}
                      title="Editar datos de mi simpatizante"
                      style={{
                        padding: "8px 10px", borderRadius: 8, background: "#e2e8f0", color: "#334155",
                        border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Edición Rápida */}
      {editingCiudadano && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: 16, padding: "24px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0f172a" }}>✏️ Editar Simpatizante</h3>
              <button onClick={() => setEditingCiudadano(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Cédula</label>
                <input type="text" value={editingCiudadano.id_unico} disabled style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f1f5f9" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editForm.nombre_completo}
                  onChange={e => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Teléfono / Celular</label>
                <input
                  type="text"
                  value={editForm.telefono}
                  onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Barrio o Vereda</label>
                <input
                  type="text"
                  value={editForm.barrio}
                  onChange={e => setEditForm({ ...editForm, barrio: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingCiudadano(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#4f46e5", color: "white", cursor: "pointer", fontWeight: 700 }}
                >
                  {savingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
