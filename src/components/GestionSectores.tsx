"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DrawingMap from "@/components/DrawingMap";
import type { Sector, SectorStat } from "@/types/ciudadano";
import { getToken, authHeadersWithJson } from "@/lib/api";

export default function GestionSectores() {
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [stats, setStats] = useState<SectorStat[]>([]);
  const [metaGlobal, setMetaGlobal] = useState(1000);
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    meta: "100",
  });
  const [poligono, setPoligono] = useState<number[][] | null>(null);

  const searchParams = useSearchParams();

  const headers = authHeadersWithJson;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [sRes, stRes, cRes] = await Promise.all([
        fetch("/api/sectores", { headers: h }),
        fetch("/api/sectores/stats", { headers: h }),
        fetch("/api/config", { headers: h }),
      ]);
      const sJson = await sRes.json();
      const stJson = await stRes.json();
      const cJson = await cRes.json();
      setSectores(sJson.data || []);
      setStats(stJson.sectorStats || []);
      const mg = parseInt(cJson.config?.meta_global || "1000");
      setMetaGlobal(mg);
      setMetaInput(String(mg));
    } catch {
      setMessage({ type: "error", text: "Error al cargar datos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setForm({ nombre: "", meta: "100" });
    setPoligono(null);
    setShowForm(false);
    setEditingId(null);
  };

  const handlePolygonComplete = (points: number[][]) => {
    setPoligono(points);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poligono || poligono.length < 3) {
      setMessage({ type: "error", text: "Debe dibujar un polígono en el mapa" });
      return;
    }
    try {
      const res = await fetch("/api/sectores", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          nombre: form.nombre,
          meta: parseInt(form.meta),
          poligono,
          latitud: 0,
          longitud: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Sector creado con polígono" });
        resetForm();
        fetchAll();
      }
    } catch {
      setMessage({ type: "error", text: "Error al crear" });
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        meta: parseInt(form.meta),
      };
      if (poligono && poligono.length >= 3) {
        body.poligono = poligono;
      }
      console.log("[Frontend] handleUpdate - id:", id, "body:", JSON.stringify(body));
      const res = await fetch(`/api/sectores/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Sector actualizado" });
        resetForm();
        fetchAll();
      }
    } catch {
      setMessage({ type: "error", text: "Error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este sector?")) return;
    try {
      const res = await fetch(`/api/sectores/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
      if (!res.ok) {
        console.error("[handleDelete] Error:", res.status, json);
        setMessage({ type: "error", text: json.error || `Error ${res.status} al eliminar` });
      } else {
        setMessage({ type: "success", text: "Sector eliminado" });
        fetchAll();
      }
    } catch (err) {
      console.error("[handleDelete] Excepción:", err);
      setMessage({ type: "error", text: `Error de conexión: ${(err as Error).message}` });
    }
  };

  const handleSaveMeta = async () => {
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ meta_global: metaInput }),
      });
      setMetaGlobal(parseInt(metaInput));
      setEditMeta(false);
      setMessage({ type: "success", text: "Meta global actualizada" });
      fetchAll();
    } catch {
      setMessage({ type: "error", text: "Error" });
    }
  };

  const startEdit = (s: SectorStat) => {
    setEditingId(s.id);
    setForm({
      nombre: s.nombre,
      meta: String(s.meta),
    });
    setPoligono(s.poligono || null);
    setShowForm(true);
  };

  // Auto-open edit form when coming from map with ?edit=ID
  useEffect(() => {
    const editId = searchParams?.get("edit");
    if (editId && stats.length > 0) {
      const sector = stats.find((s) => s.id === parseInt(editId));
      if (sector) {
        startEdit(sector);
        window.history.replaceState(null, "", "/dashboard/sectores");
      }
    }
  }, [searchParams, stats]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "cumpliendo": return { bg: "#dcfce7", color: "#16a34a", label: "Cumpliendo" };
      case "en_progreso": return { bg: "#fef3c7", color: "#d97706", label: "En Progreso" };
      default: return { bg: "#fef2f2", color: "#dc2626", label: "Crítico" };
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            borderLeft: `4px solid ${message.type === "success" ? "#16a34a" : "#dc2626"}`,
            background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? "#16a34a" : "#dc2626" }}>
              {message.text}
            </span>
            <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
          </div>
        </div>
      )}

      {/* Meta Global */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Meta Global</span>
          {!editMeta && (
            <button onClick={() => setEditMeta(true)} className="btn btn-ghost btn-sm">Editar</button>
          )}
        </div>
        <div className="card-body">
          {editMeta ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input type="number" value={metaInput} onChange={(e) => setMetaInput(e.target.value)} className="input" style={{ width: 160 }} min="1" />
              <button onClick={handleSaveMeta} className="btn btn-primary btn-sm">Guardar</button>
              <button onClick={() => { setEditMeta(false); setMetaInput(String(metaGlobal)); }} className="btn btn-ghost btn-sm">Cancelar</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#1e3a5f" }}>{metaGlobal}</span>
              <span style={{ fontSize: 14, color: "#64748b" }}>ciudadanos como meta total</span>
            </div>
          )}
        </div>
      </div>

      {/* Form + Drawing Map */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: "", meta: "100" }); setPoligono(null); }}
          className="btn btn-primary"
        >
          + Nuevo Sector
        </button>
      )}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {editingId ? "Editar Sector" : "Crear Nuevo Sector"}
            </span>
            <button onClick={resetForm} className="btn btn-ghost btn-sm">Cancelar</button>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
            {/* Form fields */}
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Nombre del Sector *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Barrio Centro" className="input" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Meta (registros) *</label>
                <input type="number" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} required min="1" className="input" />
              </div>

              <div style={{ marginBottom: 16, padding: 12, background: poligono ? "#f0fdf4" : "#fef2f2", borderRadius: 8, border: `1px solid ${poligono ? "#bbf7d0" : "#fecaca"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: poligono ? "#16a34a" : "#dc2626" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: poligono ? "#16a34a" : "#dc2626" }}>
                    {poligono ? `Polígono: ${poligono.length} vértices` : "Sin polígono — dibuje en el mapa"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!poligono || poligono.length < 3 || !form.nombre}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", opacity: (!poligono || poligono.length < 3 || !form.nombre) ? 0.5 : 1 }}
              >
                {editingId ? "Guardar Cambios" : "Crear Sector"}
              </button>
            </form>

            {/* Drawing map */}
            <div>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 500 }}>
                Delimite el área geográfica del sector dibujando un polígono en el mapa:
              </p>
              <DrawingMap
                onPolygonComplete={handlePolygonComplete}
                existingPolygon={poligono}
                referencePolygons={
                  sectores
                    .filter((s) => s.id !== editingId && s.poligono && Array.isArray(s.poligono) && s.poligono.length >= 3)
                    .map((s) => ({
                      polygon: s.poligono!,
                      nombre: s.nombre,
                      color: "#94a3b8",
                    }))
                }
                height={400}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sectors list */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Sectores Definidos ({stats.length})</span>
        </div>
        <div className="card-body">
          {loading ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>Cargando...</p>
          ) : stats.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>
              No hay sectores. Cree uno delimitando un área en el mapa.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {stats.map((s) => {
                const estadoInfo = getEstadoColor(s.estado);
                const color = s.porcentaje >= 80 ? "#2563eb" : s.porcentaje >= 30 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={s.id} style={{
                    padding: 18,
                    borderRadius: 12,
                    border: `1px solid ${color}22`,
                    background: s.porcentaje >= 80 ? "#eff6ff" : s.porcentaje >= 30 ? "#fffbeb" : "#fef2f2",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "#0f172a" }}>{s.nombre}</h4>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {s.registros} de {s.meta} registros
                          {s.poligono ? " · Polígono" : " · Círculo"}
                        </span>
                      </div>
                      <span className="badge" style={{ background: estadoInfo.bg, color: estadoInfo.color }}>
                        {estadoInfo.label}
                      </span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>Progreso</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color }}>{(s.porcentaje || 0).toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(s.porcentaje, 100)}%`, background: color }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(s)} className="btn btn-ghost btn-sm" style={{ padding: "4px 12px", fontSize: 12 }}>Editar</button>
                      <button onClick={() => handleDelete(s.id)} className="btn btn-danger btn-sm" style={{ padding: "4px 12px", fontSize: 12 }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
