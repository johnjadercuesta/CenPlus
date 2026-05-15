"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";
import { Comuna, Barrio, PuestoVotacion, ProblematicaSocial } from "@/types/ciudadano";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"territorio" | "referencias" | "marca">("territorio");
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [puestos, setPuestos] = useState<PuestoVotacion[]>([]);
  const [problematicas, setProblematicas] = useState<ProblematicaSocial[]>([]);
  const [comunaFilterId, setComunaFilterId] = useState<string>("");

  // Branding states
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");
  const [logoUrl, setLogoUrl] = useState("");
  const [metaGlobal, setMetaGlobal] = useState("1000");

  // Create states
  const [newComuna, setNewComuna] = useState({ nombre: "", tipo: "urbana" });
  const [newBarrio, setNewBarrio] = useState({ nombre: "", comunaId: "", tipo: "barrio" });
  const [newPuesto, setNewPuesto] = useState({ nombre: "", comunaId: "", votosHistoricos: "0" });
  const [newProblematica, setNewProblematica] = useState("");

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"comuna" | "barrio" | "puesto" | "problematica" | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const barriosFiltrados = comunaFilterId
    ? barrios.filter(b => String(b.comuna_id) === comunaFilterId)
    : barrios;

  useEffect(() => {
    fetchData();
    loadThemeConfig();
  }, []);

  const fetchData = async () => {
    try {
      const h = authHeadersWithJson();
      const [cRes, bRes, pRes, prRes] = await Promise.all([
        fetch("/api/territorio/comunas", { headers: h }).then(r => r.json()),
        fetch("/api/territorio/barrios", { headers: h }).then(r => r.json()),
        fetch("/api/territorio/puestos", { headers: h }).then(r => r.json()),
        fetch("/api/territorio/problematicas", { headers: h }).then(r => r.json()),
      ]);
      setComunas(cRes.data || []);
      setBarrios(bRes.data || []);
      setPuestos(pRes.data || []);
      setProblematicas(prRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadThemeConfig = async () => {
    try {
      const res = await fetch("/api/tenant/config");
      const data = await res.json();
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.secondary_color) setSecondaryColor(data.secondary_color);
      if (data.logo_url) setLogoUrl(data.logo_url);
      
      // Cargar meta global (ejemplo de endpoint o desde config)
      const statsRes = await fetch("/api/stats", { headers: authHeadersWithJson() });
      const statsData = await statsRes.json();
      if (statsData.meta) setMetaGlobal(String(statsData.meta));
    } catch (error) {
      console.error("Error cargando configuración de marca:", error);
    }
  };

  const handleAdd = async (url: string, body: any, resetFn: () => void, msg: string) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetFn();
        fetchData();
        setMessage({ type: "success", text: msg });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Error al procesar" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (type: string, id: number, body: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/territorio/${type}s/${id}`, {
        method: "PUT",
        headers: authHeadersWithJson(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingId(null);
        setEditingType(null);
        fetchData();
        setMessage({ type: "success", text: "Actualización exitosa" });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Error al actualizar" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: number, label: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${label}"? Esta acción puede afectar datos relacionados.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/territorio/${type}s/${id}`, {
        method: "DELETE",
        headers: authHeadersWithJson(),
      });
      if (res.ok) {
        if (type === "comuna" && String(id) === comunaFilterId) setComunaFilterId("");
        fetchData();
        setMessage({ type: "success", text: `"${label}" eliminado correctamente` });
      } else {
        const json = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: json.error || `Error al eliminar "${label}"` });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión al eliminar" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/config/update", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl || null
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Personalización guardada con éxito." });
        document.documentElement.style.setProperty('--brand-accent', primaryColor);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Error al guardar marca" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/meta", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify({ valor: metaGlobal }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Meta global actualizada." });
      } else {
        setMessage({ type: "error", text: "Error al actualizar meta." });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión." });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (type: any, item: any) => {
    setEditingType(type);
    setEditingId(String(item.id));
    if (type === "comuna") setEditForm({ nombre: item.nombre, tipo: item.tipo });
    if (type === "problematica") setEditForm({ nombre: item.nombre });
    if (type === "barrio") setEditForm({ nombre: item.nombre, comunaId: String(item.comuna_id), tipo: item.tipo });
    if (type === "puesto") setEditForm({ nombre: item.nombre, comunaId: String(item.comuna_id || ""), votosHistoricos: String(item.votos_historicos) });
  };

  return (
    <div className="container" style={{ padding: "20px 0" }}>
      <div className="main-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="main-header-title">Configuración del Sistema</h1>
          <p className="main-header-subtitle">Administra el territorio, las referencias y la identidad de marca</p>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#15803d" : "#b91c1c",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
        <TabButton active={activeTab === "territorio"} onClick={() => setActiveTab("territorio")} label="Territorio" icon="📍" />
        <TabButton active={activeTab === "referencias"} onClick={() => setActiveTab("referencias")} label="Referencias" icon="⚙️" />
        <TabButton active={activeTab === "marca"} onClick={() => setActiveTab("marca")} label="Marca y Estilo" icon="🎨" />
      </div>

      <div className="main-content">
        {activeTab === "territorio" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Comunas */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Comunas / Corregimientos</span></div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAdd("/api/territorio/comunas", newComuna, () => setNewComuna({ nombre: "", tipo: "urbana" }), "Agregado correctamente"); }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" className="input" placeholder="Nombre" value={newComuna.nombre} onChange={(e) => setNewComuna({...newComuna, nombre: e.target.value})} />
                    <select className="input" style={{ width: "120px" }} value={newComuna.tipo} onChange={e => setNewComuna({...newComuna, tipo: e.target.value})}>
                        <option value="urbana">Urbana</option>
                        <option value="rural">Rural</option>
                    </select>
                    <button type="submit" disabled={loading} className="btn btn-primary">+</button>
                  </div>
                </form>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {comunas.map(c => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: comunaFilterId === String(c.id) ? "#f5f3ff" : "transparent" }} onClick={() => setComunaFilterId(prev => prev === String(c.id) ? "" : String(c.id))}>
                      {editingType === "comuna" && editingId === String(c.id) ? (
                        <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                          <input type="text" className="input" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                          <button onClick={() => handleUpdate("comuna", c.id, editForm)} className="btn btn-primary btn-sm">ok</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
                          <span style={{ fontSize: 13 }}>{c.nombre} <small style={{ color: "#94a3b8" }}>({c.tipo})</small></span>
                          <ActionButtons onEdit={() => startEdit("comuna", c)} onDelete={() => handleDelete("comuna", c.id, c.nombre)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Barrios */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight: 700 }}>Barrios / Veredas</span>
                {comunaFilterId && <small style={{ color: "#6366f1", marginLeft: 8 }}>Filtrando...</small>}
              </div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAdd("/api/territorio/barrios", newBarrio, () => setNewBarrio({...newBarrio, nombre: ""}), "Agregado"); }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <select className="input" value={newBarrio.comunaId} onChange={e => setNewBarrio({...newBarrio, comunaId: e.target.value})}>
                    <option value="">Seleccionar Comuna...</option>
                    {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" className="input" placeholder="Nombre Barrio" value={newBarrio.nombre} onChange={e => setNewBarrio({...newBarrio, nombre: e.target.value})} />
                    <button type="submit" disabled={loading || !newBarrio.comunaId} className="btn btn-primary">+</button>
                  </div>
                </form>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {barriosFiltrados.map(b => (
                    <div key={b.id} style={{ padding: "8px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13 }}>{b.nombre}</span>
                        <ActionButtons onEdit={() => startEdit("barrio", b)} onDelete={() => handleDelete("barrio", b.id, b.nombre)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "referencias" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Puestos */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Puestos de Votación</span></div>
              <div className="card-body">
                <form onSubmit={e => { e.preventDefault(); handleAdd("/api/territorio/puestos", newPuesto, () => setNewPuesto({nombre:"", comunaId:"", votosHistoricos:"0"}), "Puesto OK"); }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                   <input type="text" className="input" placeholder="Nombre Puesto" value={newPuesto.nombre} onChange={e => setNewPuesto({...newPuesto, nombre: e.target.value})} />
                   <div style={{ display: "flex", gap: 8 }}>
                     <input type="number" className="input" placeholder="Votos Hist." value={newPuesto.votosHistoricos} onChange={e => setNewPuesto({...newPuesto, votosHistoricos: e.target.value})} />
                     <button type="submit" className="btn btn-primary">+</button>
                   </div>
                </form>
                {puestos.map(p => (
                  <div key={p.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13 }}>{p.nombre}</span>
                    <ActionButtons onEdit={() => startEdit("puesto", p)} onDelete={() => handleDelete("puesto", p.id, p.nombre)} />
                  </div>
                ))}
              </div>
            </div>
            {/* Problematicas */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Problemáticas Sociales</span></div>
              <div className="card-body">
                <form onSubmit={e => { e.preventDefault(); handleAdd("/api/territorio/problematicas", { nombre: newProblematica }, () => setNewProblematica(""), "Problema OK"); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input type="text" className="input" placeholder="Nueva problemática" value={newProblematica} onChange={e => setNewProblematica(e.target.value)} />
                  <button type="submit" className="btn btn-primary">+</button>
                </form>
                {problematicas.map(p => (
                  <div key={p.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13 }}>{p.nombre}</span>
                    <ActionButtons onEdit={() => startEdit("problematica", p)} onDelete={() => handleDelete("problematica", p.id, p.nombre)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marca" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Personalización de Identidad</span></div>
              <form onSubmit={handleSaveBranding} className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Color Primario</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 40, height: 40, border: "none", borderRadius: 4 }} />
                      <input type="text" className="input" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Logo (URL)</label>
                    <input type="url" className="input" placeholder="https://..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <button type="button" onClick={() => { setPrimaryColor("#3b82f6"); setSecondaryColor("#6366f1"); setLogoUrl(""); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Restablecer originales</button>
                   <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Guardando..." : "Guardar Marca"}</button>
                </div>
              </form>
            </div>
            
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Configuración General</span></div>
              <div className="card-body">
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Meta Global Territorial</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" className="input" value={metaGlobal} onChange={e => setMetaGlobal(e.target.value)} />
                  <button onClick={handleSaveMeta} disabled={saving} className="btn btn-success">Actualizar Meta</button>
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>Este valor define el 100% en las gráficas de cumplimiento del dashboard.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .card-header { padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; display: flex; align-items: center; justify-content: space-between; }
        .card-body { padding: 20px; }
        .input { border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 13px; width: 100%; transition: border-color 0.2s; }
        .input:focus { outline: none; border-color: #6366f1; }
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-success { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
}

function TabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderRadius: 8,
        fontSize: 14, fontWeight: active ? 700 : 500,
        color: active ? "#6366f1" : "#64748b",
        backgroundColor: active ? "#f5f3ff" : "transparent",
        transition: "all 0.2s"
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onEdit} className="btn-icon" title="Editar">✏️</button>
      <button onClick={onDelete} className="btn-icon" title="Eliminar" style={{ color: "#ef4444" }}>🗑️</button>
      <style jsx>{`
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px; border-radius: 4px; transition: background 0.2s; }
        .btn-icon:hover { background: #f1f5f9; }
      `}</style>
    </div>
  );
}
