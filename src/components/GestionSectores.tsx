"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DrawingMap from "@/components/DrawingMap";
import type { Sector, SectorStat, Comuna, Barrio } from "@/types/ciudadano";
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
    votos_historicos: "0",
    descripcion: "",
    zona: "urbana", // New field
    comuna_id: "",
    barrio_id: "",
  });
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [activeBarrios, setActiveBarrios] = useState<Barrio[]>([]);
  const [poligono, setPoligono] = useState<number[][] | null>(null);

  const searchParams = useSearchParams();

  const headers = authHeadersWithJson;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [sRes, stRes, cRes, comRes] = await Promise.all([
        fetch("/api/sectores", { headers: h }),
        fetch("/api/sectores/stats", { headers: h }),
        fetch("/api/config", { headers: h }),
        fetch("/api/territorio/comunas", { headers: h }),
      ]);
      const sJson = await sRes.json();
      const stJson = await stRes.json();
      const cJson = await cRes.json();
      const comJson = await comRes.json();
      
      setSectores(sJson.data || []);
      setStats(stJson.sectorStats || []);
      setComunas(comJson.data || []);
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
    setForm({ nombre: "", meta: "100", votos_historicos: "0", descripcion: "", zona: "urbana", comuna_id: "", barrio_id: "" });
    setActiveBarrios([]);
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
          ...form,
          meta: parseInt(form.meta),
          votos_historicos: parseInt(form.votos_historicos),
          comuna_id: form.comuna_id ? parseInt(form.comuna_id) : null,
          barrio_id: form.barrio_id ? parseInt(form.barrio_id) : null,
          poligono,
          latitud: 0,
          longitud: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Sector territorial creado correctamente" });
        resetForm();
        fetchAll();
      }
    } catch {
      setMessage({ type: "error", text: "Error al crear el sector" });
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const body: Record<string, unknown> = {
        ...form,
        meta: parseInt(form.meta),
        votos_historicos: parseInt(form.votos_historicos),
        comuna_id: form.comuna_id ? parseInt(form.comuna_id) : null,
        barrio_id: form.barrio_id ? parseInt(form.barrio_id) : null,
      };
      if (poligono && poligono.length >= 3) {
        body.poligono = poligono;
      }
      const res = await fetch(`/api/sectores/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Sector actualizado correctamente" });
        resetForm();
        fetchAll();
      }
    } catch {
      setMessage({ type: "error", text: "Error al actualizar" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este sector territorial? Se perderá la meta asociada.")) return;
    try {
      const res = await fetch(`/api/sectores/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || `Error ${res.status} al eliminar` });
      } else {
        setMessage({ type: "success", text: "Sector eliminado" });
        fetchAll();
      }
    } catch (err) {
      setMessage({ type: "error", text: `Error de conexión` });
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
      setMessage({ type: "success", text: "Meta global de Inteligencia Territorial actualizada" });
      fetchAll();
    } catch {
      setMessage({ type: "error", text: "Error al guardar configuración" });
    }
  };

  const startEdit = async (s: any) => {
    setEditingId(s.id);
    setForm({
      nombre: s.nombre,
      meta: String(s.meta),
      votos_historicos: String(s.votosHistoricos || 0),
      descripcion: s.descripcion || "",
      zona: s.zona || "urbana",
      comuna_id: s.comuna_id ? String(s.comuna_id) : "",
      barrio_id: s.barrio_id ? String(s.barrio_id) : "",
    });
    
    if (s.comuna_id) {
       const token = getToken();
       const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
       const bRes = await fetch(`/api/territorio/barrios?comunaId=${s.comuna_id}`, { headers: h });
       const bJson = await bRes.json();
       setActiveBarrios(bJson.data || []);
    }

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
      case "cumpliendo": return { bg: "#dcfce7", color: "#16a34a", label: "Óptimo" };
      case "en_progreso": return { bg: "#fef3c7", color: "#d97706", label: "En Alerta" };
      default: return { bg: "#fef2f2", color: "#dc2626", label: "Crítico" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Meta Global KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b", textTransform: "uppercase" }}>Meta Global de Captación</span>
            {!editMeta && (
              <button onClick={() => setEditMeta(true)} className="btn btn-ghost btn-sm">Ajustar</button>
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
                <span style={{ fontSize: 32, fontWeight: 800, color: "#1e3a5f" }}>{metaGlobal}</span>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>apoyos proyectados</span>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ background: "linear-gradient(135deg, #f8fafc, #eff6ff)" }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 13, color: "#3b82f6", textTransform: "uppercase" }}>Total Registros Actuales</span>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#2563eb" }}>
                {stats.reduce((acc, s) => acc + s.registros, 0)}
              </span>
              <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>
                ({Math.round((stats.reduce((acc, s) => acc + s.registros, 0) / (metaGlobal || 1)) * 100)}% de la meta)
              </span>
            </div>
          </div>
        </div>

        {/* Comparativo: suma metas sectoriales vs meta global */}
        {(() => {
          const sumaMetas = stats.reduce((acc, s) => acc + (s.meta || 0), 0);
          const diff = sumaMetas - metaGlobal;
          const pct = metaGlobal > 0 ? Math.round((sumaMetas / metaGlobal) * 100) : 0;
          const ok = Math.abs(diff) <= Math.round(metaGlobal * 0.05); // ±5% tolerancia
          const color = ok ? "#16a34a" : diff > 0 ? "#d97706" : "#dc2626";
          const bg = ok ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : diff > 0 ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "linear-gradient(135deg, #fef2f2, #fecaca)";
          return (
            <div className="card" style={{ background: bg, border: `1px solid ${color}22` }}>
              <div className="card-header">
                <span style={{ fontWeight: 700, fontSize: 13, color, textTransform: "uppercase" }}>Distribución de Metas</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color }}>{sumaMetas}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>asignadas / {metaGlobal} globales ({pct}%)</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color }}>
                  {ok ? "✅ Distribución alineada con la meta global" :
                   diff > 0 ? `⚠️ Exceso de ${diff} sobre la meta global` :
                              `🔴 Faltan ${Math.abs(diff)} por asignar a sectores`}
                </div>
                <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {message && (
        <div style={{
          padding: "12px 18px", borderRadius: 10,
          borderLeft: `4px solid ${message.type === "success" ? "#16a34a" : "#dc2626"}`,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          animation: "fadeIn 0.3s ease",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: message.type === "success" ? "#15803d" : "#b91c1c" }}>
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
        </div>
      )}

      {/* Form + Drawing Map */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: "", meta: "100", votos_historicos: "0", descripcion: "", zona: "urbana", comuna_id: "", barrio_id: "" }); setPoligono(null); }}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: 14, fontWeight: 800 }}
        >
          + Crear Nuevo Sector de Inteligencia Territorial
        </button>
      )}

      {showForm && (
        <div className="card" style={{ border: "2px solid #3b82f622" }}>
          <div className="card-header" style={{ background: "#f8fafc" }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#1e3a5f" }}>
              {editingId ? "⚙️ Parametrización de Sector" : "🗺️ Definición de Nuevo Territorio"}
            </span>
            <button onClick={resetForm} className="btn btn-ghost btn-sm">Cerrar</button>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
            {/* Form fields */}
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate}>
              <div style={{ marginBottom: 16 }}>
                 <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Zona Territorial</label>
                 <div style={{ display: "flex", gap: 8 }}>
                    {['urbana', 'rural'].map(z => (
                        <button
                            key={z}
                            type="button"
                            onClick={() => setForm({...form, zona: z, comuna_id: "", barrio_id: ""})}
                            style={{
                                flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0",
                                background: form.zona === z ? "#6366f1" : "white",
                                color: form.zona === z ? "white" : "#64748b",
                                fontSize: 12, fontWeight: 700, cursor: "pointer"
                            }}
                        >
                            {z.toUpperCase()}
                        </button>
                    ))}
                 </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                    {form.zona === 'urbana' ? "Comuna (Sector)" : "Corregimiento"}
                  </label>
                  <select 
                    className="input" 
                    value={form.comuna_id} 
                    onChange={async (e) => {
                      const cid = e.target.value;
                      setForm({ ...form, comuna_id: cid, barrio_id: "" });
                      if (cid) {
                        const token = getToken();
                        const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
                        const bRes = await fetch(`/api/territorio/barrios?comunaId=${cid}`, { headers: h });
                        const bJson = await bRes.json();
                        setActiveBarrios(bJson.data || []);
                        if (!form.nombre) {
                          const comName = comunas.find(c => String(c.id) === cid)?.nombre;
                          setForm(f => ({ ...f, nombre: comName || "", comuna_id: cid, barrio_id: "" }));
                        }
                      } else {
                        setActiveBarrios([]);
                      }
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {comunas.filter(c => c.tipo === form.zona).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
                    {form.zona === 'urbana' ? "Barrio Vinculado" : "Vereda Vinculada"}
                  </label>
                  <select 
                    className="input" 
                    value={form.barrio_id} 
                    onChange={(e) => {
                      const bid = e.target.value;
                      setForm({ ...form, barrio_id: bid });
                      const bName = activeBarrios.find(b => String(b.id) === bid)?.nombre;
                      if (bName) setForm(f => ({ ...f, nombre: bName, barrio_id: bid }));
                    }}
                    disabled={!form.comuna_id}
                  >
                    <option value="">Seleccionar...</option>
                    {activeBarrios.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Nombre Público del Sector *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Zona Norte - Popular" className="input" />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Meta Captación *</label>
                  <input type="number" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} required min="1" className="input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Votos Históricos</label>
                  <input type="number" value={form.votos_historicos} onChange={(e) => setForm({ ...form, votos_historicos: e.target.value })} min="0" className="input" />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Observaciones Estratégicas</label>
                <textarea 
                  value={form.descripcion} 
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })} 
                  placeholder="Notas sobre líderes o problemáticas en la zona..." 
                  className="input" 
                  style={{ minHeight: 80, resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: 20, padding: 14, background: poligono ? "#f0fdf4" : "#fef2f2", borderRadius: 10, border: `1px solid ${poligono ? "#bbf7d0" : "#fecaca"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{poligono ? "✅" : "📍"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: poligono ? "#16a34a" : "#dc2626" }}>
                      {poligono ? "Geometría Validada" : "Geometría Requerida"}
                    </div>
                    <div style={{ fontSize: 11, color: poligono ? "#16a34a" : "#dc2626" }}>
                      {poligono ? `${poligono.length} puntos definidos en el mapa` : "Dibuje el área en el mapa interactivo"}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!poligono || poligono.length < 3 || !form.nombre}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: 14, fontWeight: 800, opacity: (!poligono || poligono.length < 3 || !form.nombre) ? 0.5 : 1 }}
              >
                {editingId ? "Actualizar Parámetros" : "Confirmar y Guardar Sector"}
              </button>
            </form>

            {/* Drawing map */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Delimitación de Capa Poligonal:</span>
                <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 8px", borderRadius: 10, color: "#64748b" }}>Use el mouse para dibujar</span>
              </div>
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
                height={420}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sectors list */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>Inventario de Territorios ({stats.length})</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}><div className="spinner"></div></div>
          ) : stats.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 40, fontSize: 13 }}>
              No se han definido capas territoriales. Comience creando su primer sector.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {stats.map((s) => {
                const estadoInfo = getEstadoColor(s.estado);
                const color = s.porcentaje >= 80 ? "#16a34a" : s.porcentaje >= 30 ? "#f59e0b" : "#dc2626";
                const brecha = (s.votosHistoricos || 0) - s.registros;
                
                return (
                  <div key={s.id} style={{
                    padding: 20, borderRadius: 14,
                    border: `1px solid ${color}15`,
                    background: s.porcentaje >= 80 ? "#f0fdf4" : s.porcentaje >= 30 ? "#fffbeb" : "#fef2f2",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    transition: "transform 0.2s ease",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <h4 style={{ fontWeight: 800, fontSize: 16, margin: 0, color: "#0f172a" }}>{s.nombre}</h4>
                            <span style={{ fontSize: 9, padding: "2px 6px", background: s.zona === 'rural' ? '#fef3c7' : '#e0e7ff', color: s.zona === 'rural' ? '#92400e' : '#3730a3', borderRadius: 4, fontWeight: 700 }}>
                                {s.zona === 'rural' ? 'RURAL' : 'URBANO'}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "flex", gap: 8 }}>
                          <span>📈 Meta: {s.meta}</span>
                          <span>🗳️ Histórico: {s.votosHistoricos || 0}</span>
                        </div>
                      </div>
                      <span className="badge" style={{ background: estadoInfo.bg, color: estadoInfo.color, fontWeight: 800 }}>
                        {estadoInfo.label}
                      </span>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Eficiencia Territorial</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color }}>{(s.porcentaje || 0).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(s.porcentaje, 100)}%`, height: "100%", background: color, borderRadius: 5, transition: "width 1s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{s.registros} apoyos reales</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: brecha > 0 ? "#dc2626" : "#16a34a" }}>
                          {brecha > 0 ? `Brecha: ${brecha}` : "Alcance lograda"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => startEdit(s)} className="btn btn-ghost btn-sm" style={{ flex: 1, padding: "8px", fontWeight: 700 }}>Parametrizar</button>
                      <button onClick={() => handleDelete(s.id)} className="btn btn-ghost btn-sm" style={{ color: "#dc2626", flex: 0.5, padding: "8px" }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .input { border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 14px; width: 100%; transition: border-color 0.2s; }
        .input:focus { outline: none; border-color: #6366f1; }
      `}</style>
    </div>
  );
}
