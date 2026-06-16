"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"territorio" | "referencias" | "marca" | "cuenta">("territorio");
  const [comunas, setComunas] = useState<any[]>([]);
  const [barrios, setBarrios] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [problematicas, setProblematicas] = useState<any[]>([]);
  const [comunaFilterId, setComunaFilterId] = useState<string>("");

  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");
  const [surfaceBg, setSurfaceBg] = useState("#f8fafc");
  const [cardBg, setCardBg] = useState("#ffffff");
  const [borderColor, setBorderColor] = useState("#e2e8f0");
  const [textPrimary, setTextPrimary] = useState("#0f172a");
  const [textSecondary, setTextSecondary] = useState("#475569");
  const [borderRadius, setBorderRadius] = useState("8");
  const [logoUrl, setLogoUrl] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [metaGlobal, setMetaGlobal] = useState("1000");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newComuna, setNewComuna] = useState({ nombre: "", tipo: "urbana" });
  const [newBarrio, setNewBarrio] = useState({ nombre: "", comunaId: "", tipo: "barrio" });
  const [newPuesto, setNewPuesto] = useState({ nombre: "", comunaId: "", votosHistoricos: "0" });
  const [newProblematica, setNewProblematica] = useState("");

  const [editingComunaId, setEditingComunaId] = useState<number | null>(null);
  const [editComuna, setEditComuna] = useState({ nombre: "", tipo: "urbana" });
  const [editingBarrioId, setEditingBarrioId] = useState<number | null>(null);
  const [editBarrio, setEditBarrio] = useState({ nombre: "", comunaId: "", tipo: "barrio" });
  const [editingPuestoId, setEditingPuestoId] = useState<number | null>(null);
  const [editPuesto, setEditPuesto] = useState({ nombre: "", comunaId: "", votosHistoricos: "0" });
  const [editingProblematicaId, setEditingProblematicaId] = useState<number | null>(null);
  const [editProblematica, setEditProblematica] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
    loadThemeConfig();
  }, []);

  useEffect(() => {
    if (fontFamily === 'Inter') return;
    const fontName = fontFamily.replace(/ /g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700;800&display=swap`;
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [fontFamily]);

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

  const handleResetColor = () => {
    setPrimaryColor('#162749');
  };

  const applyThemeVars = (cfg: any) => {
    const doc = document.documentElement;
    if (cfg.primary_color) {
      doc.style.setProperty('--brand-accent', cfg.primary_color);
      doc.style.setProperty('--brand', cfg.primary_color);
      doc.style.setProperty('--primary-glow', `${cfg.primary_color}33`);
    }
    if (cfg.secondary_color) doc.style.setProperty('--secondary', cfg.secondary_color);
    if (cfg.config?.surface_bg) doc.style.setProperty('--surface', cfg.config.surface_bg);
    if (cfg.config?.card_bg) doc.style.setProperty('--card', cfg.config.card_bg);
    if (cfg.config?.border_color) doc.style.setProperty('--border', cfg.config.border_color);
    if (cfg.config?.text_primary) doc.style.setProperty('--text-primary', cfg.config.text_primary);
    if (cfg.config?.text_secondary) doc.style.setProperty('--text-secondary', cfg.config.text_secondary);
    if (cfg.config?.border_radius) {
      doc.style.setProperty('--radius', `${cfg.config.border_radius}px`);
    }
  };

  const loadThemeConfig = async () => {
    try {
      const res = await fetch(`/api/tenant/config?t=${Date.now()}`);
      const data = await res.json();
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.secondary_color) setSecondaryColor(data.secondary_color);
      if (data.font_family) setFontFamily(data.font_family);
      if (data.logo_url) setLogoUrl(data.logo_url);
      if (data.config) {
        if (data.config.surface_bg) setSurfaceBg(data.config.surface_bg);
        if (data.config.card_bg) setCardBg(data.config.card_bg);
        if (data.config.border_color) setBorderColor(data.config.border_color);
        if (data.config.text_primary) setTextPrimary(data.config.text_primary);
        if (data.config.text_secondary) setTextSecondary(data.config.text_secondary);
        if (data.config.border_radius) setBorderRadius(String(data.config.border_radius));
      }
      applyThemeVars(data);

      const statsRes = await fetch("/api/stats", { headers: authHeadersWithJson() });
      const statsData = await statsRes.json();
      if (statsData.meta) setMetaGlobal(String(statsData.meta));
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "El logo no debe superar 2MB" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const styleConfig = {
        surface_bg: surfaceBg,
        card_bg: cardBg,
        border_color: borderColor,
        text_primary: textPrimary,
        text_secondary: textSecondary,
        border_radius: parseInt(borderRadius) || 8,
      };
      const res = await fetch("/api/tenant/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
          font_family: fontFamily,
          config: styleConfig,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Marca actualizada correctamente. Aplicando cambios..." });
        applyThemeVars({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          config: styleConfig,
        });
        setTimeout(() => {
          window.location.href = window.location.pathname + "?refresh=" + Date.now();
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTerritorio = async (url: string, body: any, resetFn: () => void) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetFn();
        fetchData();
        setMessage({ type: "success", text: "Elemento agregado correctamente" });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Error al guardar" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditTerritorio = async (url: string, id: number, body: any, cancelFn: () => void) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: authHeadersWithJson(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        cancelFn();
        fetchData();
        setMessage({ type: "success", text: "Elemento actualizado correctamente" });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Error al actualizar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerritorio = async (url: string, id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${url}/${id}`, {
        method: "DELETE",
        headers: authHeadersWithJson(),
      });
      if (res.ok) {
        fetchData();
        setMessage({ type: "success", text: "Elemento eliminado correctamente" });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Error al eliminar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas nuevas no coinciden" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Error al cambiar contraseña" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const barriosFiltrados = comunaFilterId 
    ? barrios.filter(b => String(b.comuna_id) === comunaFilterId) 
    : barrios;

  const btnEdit = (onClick: (e: React.MouseEvent) => void) => (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "13px", padding: "2px 6px" }} title="Editar">✏️</button>
  );
  const btnDelete = (onClick: (e: React.MouseEvent) => void) => (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "13px", padding: "2px 6px" }} title="Eliminar">🗑️</button>
  );
  const badgeTipo = (tipo: string, labelA: string, labelB: string) => (
    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontWeight: 600, background: tipo === "rural" || tipo === "vereda" ? "#fef3c7" : "#dbeafe", color: tipo === "rural" || tipo === "vereda" ? "#d97706" : "#1d4ed8" }}>
      {tipo === "rural" || tipo === "vereda" ? labelB : labelA}
    </span>
  );

  return (
    <div className="container" style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", margin: 0 }}>Configuración</h1>
        <p style={{ fontSize: "14px", color: "#64748b" }}>Administra tu organización y territorio</p>
      </div>

      {message && (
        <div style={{ 
          padding: "12px 16px", borderRadius: "8px", marginBottom: "24px",
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#15803d" : "#b91c1c",
          fontWeight: 600
        }}>
          {message.text}
        </div>
      )}

      <div className="config-tabs" style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", overflowX: "auto" }}>
        <button onClick={() => setActiveTab("territorio")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "territorio" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "territorio" ? 700 : 500, color: activeTab === "territorio" ? "#3b82f6" : "#64748b", whiteSpace: "nowrap" }}>📍 Territorio</button>
        <button onClick={() => setActiveTab("referencias")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "referencias" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "referencias" ? 700 : 500, color: activeTab === "referencias" ? "#3b82f6" : "#64748b", whiteSpace: "nowrap" }}>⚙️ Referencias</button>
        <button onClick={() => setActiveTab("marca")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "marca" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "marca" ? 700 : 500, color: activeTab === "marca" ? "#3b82f6" : "#64748b", whiteSpace: "nowrap" }}>🎨 Marca y Estilo</button>
        <button onClick={() => setActiveTab("cuenta")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "cuenta" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "cuenta" ? 700 : 500, color: activeTab === "cuenta" ? "#3b82f6" : "#64748b", whiteSpace: "nowrap" }}>🔒 Mi Cuenta</button>
      </div>

      <div className="content">
        {activeTab === "territorio" && (
          <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
               <h3 style={{ marginTop: 0 }}>Comunas / Corregimientos</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                     <input className="input" placeholder="Nombre" value={newComuna.nombre} onChange={e => setNewComuna({...newComuna, nombre: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1 }} />
                     <select value={newComuna.tipo} onChange={e => setNewComuna({...newComuna, tipo: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}>
                        <option value="urbana">Comuna</option>
                        <option value="rural">Corregimiento</option>
                     </select>
                     <button onClick={() => handleAddTerritorio("/api/territorio/comunas", newComuna, () => setNewComuna({nombre: "", tipo: "urbana"}))} className="btn btn-primary" disabled={loading} style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", opacity: loading ? 0.6 : 1 }}>+</button>
                  </div>
               </div>
               <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {comunas.length === 0 && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay comunas o corregimientos registrados</p>}
                  {comunas.map(c => (
                    <div key={c.id}>
                      {editingComunaId === c.id ? (
                        <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                          <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                            <input className="input" value={editComuna.nombre} onChange={e => setEditComuna({...editComuna, nombre: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", flex: 1, fontSize: "13px" }} />
                            <select value={editComuna.tipo} onChange={e => setEditComuna({...editComuna, tipo: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }}>
                              <option value="urbana">Comuna</option>
                              <option value="rural">Corregimiento</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button onClick={() => handleEditTerritorio("/api/territorio/comunas", c.id, editComuna, () => setEditingComunaId(null))} disabled={saving} style={{ background: "#059669", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Guardar</button>
                            <button onClick={() => setEditingComunaId(null)} style={{ background: "#64748b", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => { setComunaFilterId(String(c.id)); setEditingComunaId(null); }} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: comunaFilterId === String(c.id) ? "#f1f5f9" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{c.nombre}</span>
                            {badgeTipo(c.tipo, "Comuna", "Corregimiento")}
                          </div>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {btnEdit(() => { setEditingComunaId(c.id); setEditComuna({ nombre: c.nombre, tipo: c.tipo || "urbana" }); })}
                            {btnDelete((e) => { e.stopPropagation(); handleDeleteTerritorio("/api/territorio/comunas", c.id, c.nombre); })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
               <h3 style={{ marginTop: 0 }}>Barrios / Veredas {comunaFilterId && "(Filtrado)"}</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  <select value={newBarrio.comunaId} onChange={e => setNewBarrio({...newBarrio, comunaId: e.target.value})} style={{ padding: "8px" }}>
                    <option value="">Elegir Comuna/Corregimiento...</option>
                    {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo === "rural" ? "Corregimiento" : "Comuna"})</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input className="input" placeholder="Nombre" value={newBarrio.nombre} onChange={e => setNewBarrio({...newBarrio, nombre: e.target.value})} style={{ padding: "8px", flex: 1 }} />
                    <select value={newBarrio.tipo} onChange={e => setNewBarrio({...newBarrio, tipo: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}>
                      <option value="barrio">Barrio</option>
                      <option value="vereda">Vereda</option>
                    </select>
                  </div>
                  <button onClick={() => handleAddTerritorio("/api/territorio/barrios", newBarrio, () => setNewBarrio({...newBarrio, nombre: ""}))} className="btn btn-primary" disabled={loading} style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px", opacity: loading ? 0.6 : 1 }}>Guardar Barrio / Vereda</button>
               </div>
               <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {barriosFiltrados.length === 0 && comunaFilterId && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay barrios o veredas en esta comuna</p>}
                  {barriosFiltrados.length === 0 && !comunaFilterId && <p style={{ color: "#94a3b8", fontSize: "13px" }}>Selecciona una comuna para ver sus barrios</p>}
                  {barriosFiltrados.map(b => (
                    <div key={b.id}>
                      {editingBarrioId === b.id ? (
                        <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "6px" }}>
                            <select value={editBarrio.comunaId} onChange={e => setEditBarrio({...editBarrio, comunaId: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }}>
                              {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <input className="input" value={editBarrio.nombre} onChange={e => setEditBarrio({...editBarrio, nombre: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", flex: 1, fontSize: "13px" }} />
                              <select value={editBarrio.tipo} onChange={e => setEditBarrio({...editBarrio, tipo: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }}>
                                <option value="barrio">Barrio</option>
                                <option value="vereda">Vereda</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button onClick={() => handleEditTerritorio("/api/territorio/barrios", b.id, editBarrio, () => setEditingBarrioId(null))} disabled={saving} style={{ background: "#059669", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Guardar</button>
                            <button onClick={() => setEditingBarrioId(null)} style={{ background: "#64748b", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{b.nombre}</span>
                            {badgeTipo(b.tipo, "Barrio", "Vereda")}
                          </div>
                          <div>
                            {btnEdit(() => { setEditingBarrioId(b.id); setEditBarrio({ nombre: b.nombre, comunaId: String(b.comuna_id || ""), tipo: b.tipo || "barrio" }); })}
                            {btnDelete(() => handleDeleteTerritorio("/api/territorio/barrios", b.id, b.nombre))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === "referencias" && (
          <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0 }}>Puestos de Votación</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                <input className="input" placeholder="Nombre del puesto" value={newPuesto.nombre} onChange={e => setNewPuesto({...newPuesto, nombre: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                <select value={newPuesto.comunaId} onChange={e => setNewPuesto({...newPuesto, comunaId: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <option value="">Sin comuna</option>
                  {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <input className="input" type="number" placeholder="Votos históricos" value={newPuesto.votosHistoricos} onChange={e => setNewPuesto({...newPuesto, votosHistoricos: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                <button onClick={() => handleAddTerritorio("/api/territorio/puestos", newPuesto, () => setNewPuesto({ nombre: "", comunaId: "", votosHistoricos: "0" }))} className="btn btn-primary" disabled={loading} style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", opacity: loading ? 0.6 : 1 }}>+ Agregar Puesto</button>
              </div>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {puestos.length === 0 && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay puestos registrados</p>}
                {puestos.map(p => (
                  <div key={p.id}>
                    {editingPuestoId === p.id ? (
                      <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "6px" }}>
                          <input className="input" value={editPuesto.nombre} onChange={e => setEditPuesto({...editPuesto, nombre: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }} />
                          <select value={editPuesto.comunaId} onChange={e => setEditPuesto({...editPuesto, comunaId: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }}>
                            <option value="">Sin comuna</option>
                            {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                          <input className="input" type="number" value={editPuesto.votosHistoricos} onChange={e => setEditPuesto({...editPuesto, votosHistoricos: e.target.value})} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px" }} />
                        </div>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button onClick={() => handleEditTerritorio("/api/territorio/puestos", p.id, editPuesto, () => setEditingPuestoId(null))} disabled={saving} style={{ background: "#059669", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Guardar</button>
                          <button onClick={() => setEditingPuestoId(null)} style={{ background: "#64748b", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>{p.nombre}</strong>
                          {p.comuna_id && <span style={{ color: "#64748b", marginLeft: "8px" }}>— Comuna ID: {p.comuna_id}</span>}
                          {p.votos_historicos > 0 && <span style={{ color: "#64748b", marginLeft: "8px" }}>({p.votos_historicos} votos)</span>}
                        </div>
                        <div>
                          {btnEdit(() => { setEditingPuestoId(p.id); setEditPuesto({ nombre: p.nombre, comunaId: String(p.comuna_id || ""), votosHistoricos: String(p.votos_historicos || "0") }); })}
                          {btnDelete(() => handleDeleteTerritorio("/api/territorio/puestos", p.id, p.nombre))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0 }}>Problemáticas Sociales</h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input className="input" placeholder="Nombre de la problemática" value={newProblematica} onChange={e => setNewProblematica(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1 }} />
                <button onClick={() => handleAddTerritorio("/api/territorio/problematicas", { nombre: newProblematica }, () => setNewProblematica(""))} className="btn btn-primary" disabled={loading} style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", opacity: loading ? 0.6 : 1 }}>+</button>
              </div>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {problematicas.length === 0 && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay problemáticas registradas</p>}
                {problematicas.map(p => (
                  <div key={p.id}>
                    {editingProblematicaId === p.id ? (
                      <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: "6px", alignItems: "center" }}>
                        <input className="input" value={editProblematica} onChange={e => setEditProblematica(e.target.value)} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px", flex: 1, fontSize: "13px" }} />
                        <button onClick={() => handleEditTerritorio("/api/territorio/problematicas", p.id, { nombre: editProblematica }, () => setEditingProblematicaId(null))} disabled={saving} style={{ background: "#059669", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>OK</button>
                        <button onClick={() => setEditingProblematicaId(null)} style={{ background: "#64748b", color: "white", border: "none", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>X</button>
                      </div>
                    ) : (
                      <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{p.nombre}</span>
                        <div>
                          {btnEdit(() => { setEditingProblematicaId(p.id); setEditProblematica(p.nombre); })}
                          {btnDelete(() => handleDeleteTerritorio("/api/territorio/problematicas", p.id, p.nombre))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marca" && (
          <div className="card" style={{ background: cardBg, padding: "32px", borderRadius: `${borderRadius}px`, border: `1px solid ${borderColor}`, maxWidth: "900px" }}>
            <form onSubmit={handleSaveBranding}>
              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Colores Principales</h3>
              <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Color Primario</label>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <button type="button" onClick={handleResetColor} style={{ background: "none", border: "none", color: primaryColor, cursor: "pointer", fontSize: "13px", padding: 0, textDecoration: "underline" }}>Restablecer color original</button>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Color Secundario</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                </div>
              </div>

              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Fondos</h3>
              <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Fondo de Superficie</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={surfaceBg} onChange={e => setSurfaceBg(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={surfaceBg} onChange={e => setSurfaceBg(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: surfaceBg, borderRadius: "6px", border: `1px solid ${borderColor}` }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>Vista previa del fondo</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Fondo de Tarjetas</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={cardBg} onChange={e => setCardBg(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={cardBg} onChange={e => setCardBg(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: cardBg, borderRadius: "6px", border: `1px solid ${borderColor}` }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>Vista previa de tarjeta</span>
                  </div>
                </div>
              </div>

              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Textos</h3>
              <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Color de Texto Principal</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={textPrimary} onChange={e => setTextPrimary(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={textPrimary} onChange={e => setTextPrimary(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: surfaceBg, borderRadius: "6px", border: `1px solid ${borderColor}`, color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                    Texto de ejemplo
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Color de Texto Secundario</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={textSecondary} onChange={e => setTextSecondary(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={textSecondary} onChange={e => setTextSecondary(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: surfaceBg, borderRadius: "6px", border: `1px solid ${borderColor}`, color: textSecondary, fontSize: 13 }}>
                    Texto secundario de ejemplo
                  </div>
                </div>
              </div>

              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Bordes</h3>
              <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Color de Bordes</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${borderColor}`, borderRadius: `${borderRadius}px`, color: textPrimary }} />
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: cardBg, borderRadius: "6px", border: `2px solid ${borderColor}` }}>
                    <span style={{ fontSize: 12, color: textSecondary }}>Vista previa de borde</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: textPrimary }}>Radio de Bordes ({borderRadius}px)</label>
                  <input type="range" min="0" max="24" value={borderRadius} onChange={e => setBorderRadius(e.target.value)} style={{ width: "100%" }} />
                  <div style={{ display: "flex", gap: "8px", marginTop: 8 }}>
                    {[0, 16, 24].map(v => (
                      <button key={v} type="button" onClick={() => setBorderRadius(String(v))} style={{
                        padding: "4px 12px", fontSize: 12, border: `1px solid ${borderColor}`,
                        borderRadius: `${borderRadius}px`, background: parseInt(borderRadius) === v ? primaryColor : "transparent",
                        color: parseInt(borderRadius) === v ? "#fff" : textPrimary, cursor: "pointer",
                      }}>{v}px</button>
                    ))}
                  </div>
                </div>
              </div>

              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Logo Corporativo</h3>
              <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: "12px" }} />
                  </div>
                  <div style={{ padding: "16px", border: `2px dashed ${borderColor}`, borderRadius: `${borderRadius}px`, textAlign: "center" }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxHeight: "80px", maxWidth: "100%" }} /> : <span style={{ color: "#94a3b8" }}>Sin logo</span>}
                  </div>
                </div>
              </div>

              <h3 style={{ margin: "0 0 24px", color: textPrimary, fontSize: "18px", fontWeight: 700 }}>Tipo de Letra</h3>
              <div style={{ marginBottom: "32px" }}>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", border: `1px solid ${borderColor}`,
                    borderRadius: `${borderRadius}px`, fontSize: "14px", background: cardBg, color: textPrimary, cursor: "pointer",
                  }}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Nunito">Nunito</option>
                  <option value="Work Sans">Work Sans</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                </select>

                <div style={{
                  marginTop: 16, padding: 20,
                  background: surfaceBg, border: `1px solid ${borderColor}`,
                  borderRadius: `${borderRadius}px`,
                  fontFamily: fontFamily === 'Inter' ? "'Inter', sans-serif" : `'${fontFamily}', sans-serif`,
                  fontSize: 18, lineHeight: 1.8, color: textPrimary,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 4, color: textPrimary }}>
                    {fontFamily}
                  </div>
                  <div style={{ color: textSecondary, fontSize: 15 }}>
                    El veloz murciélago hindú comía feliz cardillo y kiwi. La cigüeña tocaba el saxofón detrás del palenque de paja.
                  </div>
                  <div style={{ color: textSecondary, fontSize: 13, marginTop: 12, borderTop: `1px solid ${borderColor}`, paddingTop: 12 }}>
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789
                  </div>
                </div>

                <p style={{ color: textSecondary, fontSize: "12px", marginTop: 6 }}>
                  Al guardar, el cambio se aplica en toda la aplicación.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ background: primaryColor, color: "white", border: "none", padding: "12px 24px", borderRadius: `${borderRadius}px`, cursor: "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "Guardar Personalización"}</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "cuenta" && (
          <div className="card" style={{ background: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", maxWidth: "600px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "24px" }}>Cambiar Contraseña</h3>
            <form onSubmit={handleChangePassword}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Contraseña Actual</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Ingresa tu contraseña actual" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Nueva Contraseña</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Confirmar Nueva Contraseña</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Repite la nueva contraseña" style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : "Cambiar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
