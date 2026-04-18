"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";
import { Comuna, Barrio, PuestoVotacion, ProblematicaSocial } from "@/types/ciudadano";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"territorio" | "referencias">("territorio");
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [puestos, setPuestos] = useState<PuestoVotacion[]>([]);
  const [problematicas, setProblematicas] = useState<ProblematicaSocial[]>([]);
  // Filtro de comunas para la vista de barrios
  const [comunaFilterId, setComunaFilterId] = useState<string>("");

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Barrios filtrados por la comuna seleccionada
  const barriosFiltrados = comunaFilterId
    ? barrios.filter(b => String(b.comuna_id) === comunaFilterId)
    : barrios;

  useEffect(() => {
    fetchData();
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
        // Si eliminamos la comuna activa en el filtro, limpiar filtro
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
          <h1 className="main-header-title">Configuración de Referencia</h1>
          <p className="main-header-subtitle">Administra la estructura territorial urbana y rural</p>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#15803d" : "#b91c1c",
          display: "flex", justifyContent: "space-between"
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
        <TabButton active={activeTab === "territorio"} onClick={() => setActiveTab("territorio")} label="Territorio (Urbano/Rural)" icon="📍" />
        <TabButton active={activeTab === "referencias"} onClick={() => setActiveTab("referencias")} label="Referencias (Puestos/Alertas)" icon="⚙️" />
      </div>

      <div className="main-content" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {activeTab === "territorio" ? (
          <>
            {/* Sección Comunas / Corregimientos */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Comunas / Corregimientos</span></div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAdd("/api/territorio/comunas", newComuna, () => setNewComuna({ nombre: "", tipo: "urbana" }), "Agregado correctamente"); }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" className="input" placeholder="Nombre (ej: Comuna 1 o Santa Elena)" value={newComuna.nombre} onChange={(e) => setNewComuna({...newComuna, nombre: e.target.value})} />
                    <select className="input" style={{ width: "120px" }} value={newComuna.tipo} onChange={e => setNewComuna({...newComuna, tipo: e.target.value})}>
                        <option value="urbana">Urbana</option>
                        <option value="rural">Rural</option>
                    </select>
                    <button type="submit" disabled={loading} className="btn btn-primary">+</button>
                  </div>
                </form>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {comunas.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: "8px 0", borderBottom: "1px solid #f1f5f9",
                        background: comunaFilterId === String(c.id) ? "#f5f3ff" : "transparent",
                        borderRadius: 6, cursor: "pointer",
                      }}
                      onClick={() => setComunaFilterId(prev => prev === String(c.id) ? "" : String(c.id))}
                    >
                      {editingType === "comuna" && editingId === String(c.id) ? (
                        <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                          <input type="text" className="input" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                          <select className="input" value={editForm.tipo} onChange={e => setEditForm({...editForm, tipo: e.target.value})}>
                             <option value="urbana">Urbana</option>
                             <option value="rural">Rural</option>
                          </select>
                          <button onClick={() => handleUpdate("comuna", c.id, editForm)} className="btn btn-primary btn-sm">ok</button>
                          <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">x</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                             {comunaFilterId === String(c.id) && <span style={{ fontSize: 10, color: "#6366f1" }}>▶</span>}
                             <span style={{ fontSize: 13, fontWeight: comunaFilterId === String(c.id) ? 700 : 400 }}>{c.nombre}</span>
                             <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: c.tipo === 'rural' ? '#fef3c7' : '#e0e7ff', color: c.tipo === 'rural' ? '#92400e' : '#3730a3' }}>
                                {c.tipo === 'rural' ? 'Corregimiento' : 'Comuna'}
                             </span>
                          </div>
                          <div onClick={e => e.stopPropagation()}>
                            <ActionButtons onEdit={() => startEdit("comuna", c)} onDelete={() => handleDelete("comuna", c.id, c.nombre)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sección Barrios / Veredas */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>Barrios / Veredas</span>
                {comunaFilterId && (
                  <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>
                    Filtrando: {comunas.find(c => String(c.id) === comunaFilterId)?.nombre}
                    <button onClick={() => setComunaFilterId("")} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 6, color: "#94a3b8", fontSize: 12 }}>✕</button>
                  </span>
                )}
              </div>
              <div className="card-body">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newBarrio.comunaId) { setMessage({ type: "error", text: "Debe seleccionar una Comuna/Corregimiento" }); return; }
                  handleAdd("/api/territorio/barrios", newBarrio, () => setNewBarrio({ ...newBarrio, nombre: "" }), "Agregado correctamente");
                }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <select className="input" value={newBarrio.comunaId} onChange={(e) => {
                      const c = comunas.find(x => x.id === parseInt(e.target.value));
                      setNewBarrio({ ...newBarrio, comunaId: e.target.value, tipo: c?.tipo === 'rural' ? 'vereda' : 'barrio' });
                  }}>
                    <option value="">Seleccionar Comuna/Corregimiento...</option>
                    {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" className="input" placeholder={newBarrio.tipo === 'vereda' ? "Nueva Vereda" : "Nuevo Barrio"} value={newBarrio.nombre} onChange={(e) => setNewBarrio({ ...newBarrio, nombre: e.target.value })} />
                    <button type="submit" disabled={loading || !newBarrio.comunaId} className="btn btn-primary" style={{ opacity: !newBarrio.comunaId ? 0.5 : 1 }}>+</button>
                  </div>
                </form>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {barriosFiltrados.length === 0 && comunaFilterId && (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
                      No hay barrios/veredas en {comunas.find(c => String(c.id) === comunaFilterId)?.nombre}.
                    </p>
                  )}
                  {barriosFiltrados.map(b => (
                    <div key={b.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      {editingType === "barrio" && editingId === String(b.id) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <select className="input" value={editForm.comunaId} onChange={e => {
                              const c = comunas.find(x => x.id === parseInt(e.target.value));
                              setEditForm({...editForm, comunaId: e.target.value, tipo: c?.tipo === 'rural' ? 'vereda' : 'barrio'});
                          }}>
                             {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input type="text" className="input" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                            <button onClick={() => handleUpdate("barrio", b.id, editForm)} className="btn btn-primary btn-sm">ok</button>
                            <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">x</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13 }}>{b.nombre}</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 10, color: "#6366f1" }}>{comunas.find(c => c.id === b.comuna_id)?.nombre}</span>
                                <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>
                                    {b.tipo}
                                </span>
                            </div>
                          </div>
                          <ActionButtons onEdit={() => startEdit("barrio", b)} onDelete={() => handleDelete("barrio", b.id, b.nombre)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sección Puestos */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Puestos de Votación</span></div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAdd("/api/territorio/puestos", newPuesto, () => setNewPuesto({ nombre: "", comunaId: "", votosHistoricos: "0" }), "Puesto agregado"); }} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <input type="text" className="input" placeholder="Nombre del Puesto" value={newPuesto.nombre} onChange={(e) => setNewPuesto({ ...newPuesto, nombre: e.target.value })} />
                  <select className="input" value={newPuesto.comunaId} onChange={(e) => setNewPuesto({ ...newPuesto, comunaId: e.target.value })}>
                    <option value="">(Sin Comuna/Corregimiento)</option>
                    {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" className="input" placeholder="Votos Históricos" value={newPuesto.votosHistoricos} onChange={(e) => setNewPuesto({ ...newPuesto, votosHistoricos: e.target.value })} />
                    <button type="submit" disabled={loading} className="btn btn-primary">+</button>
                  </div>
                </form>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {puestos.map(p => (
                    <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                      {editingType === "puesto" && editingId === String(p.id) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                           <input type="text" className="input" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                           <select className="input" value={editForm.comunaId} onChange={e => setEditForm({...editForm, comunaId: e.target.value})}>
                              <option value="">(Sin asignar)</option>
                              {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                           </select>
                           <div style={{ display: "flex", gap: 8 }}>
                             <input type="number" className="input" value={editForm.votosHistoricos} onChange={e => setEditForm({...editForm, votosHistoricos: e.target.value})} />
                             <button onClick={() => handleUpdate("puesto", p.id, editForm)} className="btn btn-primary btn-sm">ok</button>
                             <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">x</button>
                           </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                                {comunas.find(c => c.id === p.comuna_id)?.nombre} | Votos: {p.votos_historicos}
                            </div>
                          </div>
                          <ActionButtons onEdit={() => startEdit("puesto", p)} onDelete={() => handleDelete("puesto", p.id, p.nombre)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sección Problemáticas */}
            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 700 }}>Problemáticas Sociales</span></div>
              <div className="card-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAdd("/api/territorio/problematicas", { nombre: newProblematica }, () => setNewProblematica(""), "Problema agregado"); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input type="text" className="input" placeholder="Problemática Social" value={newProblematica} onChange={(e) => setNewProblematica(e.target.value)} />
                  <button type="submit" disabled={loading} className="btn btn-primary">+</button>
                </form>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {problematicas.map(p => (
                    <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                       {editingType === "problematica" && editingId === String(p.id) ? (
                         <div style={{ display: "flex", gap: 8 }}>
                            <input type="text" className="input" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                            <button onClick={() => handleUpdate("problematica", p.id, editForm)} className="btn btn-primary btn-sm">ok</button>
                            <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">x</button>
                         </div>
                       ) : (
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                             <span style={{ fontSize: 16 }}>⚠️</span>
                             <span style={{ fontSize: 13 }}>{p.nombre}</span>
                           </div>
                           <ActionButtons onEdit={() => startEdit("problematica", p)} onDelete={() => handleDelete("problematica", p.id, p.nombre)} />
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .card-header { padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; }
        .card-body { padding: 20px; }
        .input { border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 13px; width: 100%; transition: border-color 0.2s; }
        .input:focus { outline: none; border-color: #6366f1; }
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
