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

  // Branding states
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [metaGlobal, setMetaGlobal] = useState("1000");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Create states
  const [newComuna, setNewComuna] = useState({ nombre: "", tipo: "urbana" });
  const [newBarrio, setNewBarrio] = useState({ nombre: "", comunaId: "", tipo: "barrio" });
  const [newPuesto, setNewPuesto] = useState({ nombre: "", comunaId: "", votosHistoricos: "0" });
  const [newProblematica, setNewProblematica] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const handleResetColor = () => {
    setPrimaryColor('#162749');
  };

  const loadThemeConfig = async () => {
    try {
      // Usamos un timestamp para evitar que el navegador nos de una versión vieja (caché)
      const res = await fetch(`/api/tenant/config?t=${Date.now()}`);
      const data = await res.json();
      if (data.primary_color) {
        setPrimaryColor(data.primary_color);
        document.documentElement.style.setProperty('--brand-accent', data.primary_color);
      }
      if (data.font_family) {
        setFontFamily(data.font_family);
      }
      if (data.logo_url) {
        setLogoUrl(data.logo_url);
      }
      
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
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
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
      const res = await fetch("/api/tenant/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primaryColor,
          logo_url: logoUrl,
          font_family: fontFamily,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Marca actualizada correctamente. Aplicando cambios..." });
        document.documentElement.style.setProperty('--brand-accent', primaryColor);
        // Recargamos después de un momento para que se vea el mensaje de éxito
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

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => setActiveTab("territorio")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "territorio" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "territorio" ? 700 : 500, color: activeTab === "territorio" ? "#3b82f6" : "#64748b" }}>📍 Territorio</button>
        <button onClick={() => setActiveTab("referencias")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "referencias" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "referencias" ? 700 : 500, color: activeTab === "referencias" ? "#3b82f6" : "#64748b" }}>⚙️ Referencias</button>
        <button onClick={() => setActiveTab("marca")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "marca" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "marca" ? 700 : 500, color: activeTab === "marca" ? "#3b82f6" : "#64748b" }}>🎨 Marca y Estilo</button>
        <button onClick={() => setActiveTab("cuenta")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "cuenta" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "cuenta" ? 700 : 500, color: activeTab === "cuenta" ? "#3b82f6" : "#64748b" }}>🔒 Mi Cuenta</button>
      </div>

      <div className="content">
        {activeTab === "territorio" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
               <h3 style={{ marginTop: 0 }}>Comunas / Corregimientos</h3>
               <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <input className="input" placeholder="Nombre" value={newComuna.nombre} onChange={e => setNewComuna({...newComuna, nombre: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1 }} />
                  <button onClick={() => handleAddTerritorio("/api/territorio/comunas", newComuna, () => setNewComuna({nombre: "", tipo: "urbana"}))} className="btn btn-primary" style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px" }}>+</button>
               </div>
               <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {comunas.map(c => (
                    <div key={c.id} onClick={() => setComunaFilterId(String(c.id))} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: comunaFilterId === String(c.id) ? "#f1f5f9" : "transparent" }}>{c.nombre}</div>
                  ))}
               </div>
            </div>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
               <h3 style={{ marginTop: 0 }}>Barrios / Veredas {comunaFilterId && "(Filtrado)"}</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  <select value={newBarrio.comunaId} onChange={e => setNewBarrio({...newBarrio, comunaId: e.target.value})} style={{ padding: "8px" }}>
                    <option value="">Elegir Comuna...</option>
                    {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <input className="input" placeholder="Nombre Barrio" value={newBarrio.nombre} onChange={e => setNewBarrio({...newBarrio, nombre: e.target.value})} style={{ padding: "8px" }} />
                  <button onClick={() => handleAddTerritorio("/api/territorio/barrios", newBarrio, () => setNewBarrio({...newBarrio, nombre: ""}))} className="btn btn-primary" style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px" }}>Guardar Barrio</button>
               </div>
               <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {barriosFiltrados.map(b => (
                    <div key={b.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{b.nombre}</div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === "referencias" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0 }}>Puestos de Votación</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                <input className="input" placeholder="Nombre del puesto" value={newPuesto.nombre} onChange={e => setNewPuesto({...newPuesto, nombre: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                <select value={newPuesto.comunaId} onChange={e => setNewPuesto({...newPuesto, comunaId: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <option value="">Sin comuna</option>
                  {comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <input className="input" type="number" placeholder="Votos históricos" value={newPuesto.votosHistoricos} onChange={e => setNewPuesto({...newPuesto, votosHistoricos: e.target.value})} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                <button onClick={() => handleAddTerritorio("/api/territorio/puestos", newPuesto, () => setNewPuesto({ nombre: "", comunaId: "", votosHistoricos: "0" }))} className="btn btn-primary" style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px" }}>+ Agregar Puesto</button>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {puestos.length === 0 && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay puestos registrados</p>}
                {puestos.map(p => (
                  <div key={p.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
                    <strong>{p.nombre}</strong>
                    {p.comuna_id && <span style={{ color: "#64748b", marginLeft: "8px" }}>— Comuna ID: {p.comuna_id}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ marginTop: 0 }}>Problemáticas Sociales</h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input className="input" placeholder="Nombre de la problemática" value={newProblematica} onChange={e => setNewProblematica(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1 }} />
                <button onClick={() => handleAddTerritorio("/api/territorio/problematicas", { nombre: newProblematica }, () => setNewProblematica(""))} className="btn btn-primary" style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px" }}>+</button>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {problematicas.length === 0 && <p style={{ color: "#94a3b8", fontSize: "13px" }}>No hay problemáticas registradas</p>}
                {problematicas.map(p => (
                  <div key={p.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{p.nombre}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "marca" && (
          <div className="card" style={{ background: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", maxWidth: "800px" }}>
            <form onSubmit={handleSaveBranding}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Color de la Aplicación</label>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ flex: 1, padding: "8px", border: "1px solid #ccc" }} />
                  </div>
                  <button type="button" onClick={handleResetColor} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "13px", padding: 0, textDecoration: "underline" }}>Restablecer color original</button>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Logo Corporativo</label>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: "12px" }} />
                  <div style={{ padding: "16px", border: "2px dashed #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxHeight: "80px", maxWidth: "100%" }} /> : <span style={{ color: "#94a3b8" }}>Sin logo</span>}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Tipo de Letra</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", border: "1px solid #d1d5db",
                    borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer",
                    fontFamily: fontFamily === 'Inter' ? "'Inter', sans-serif" : `'${fontFamily}', sans-serif`,
                  }}
                >
                  <option value="Inter" style={{ fontFamily: "'Inter', sans-serif" }}>Inter — ¿El rápido fox brinca?</option>
                  <option value="Roboto" style={{ fontFamily: "'Roboto', sans-serif" }}>Roboto — ¿El rápido fox brinca?</option>
                  <option value="Open Sans" style={{ fontFamily: "'Open Sans', sans-serif" }}>Open Sans — ¿El rápido fox brinca?</option>
                  <option value="Lato" style={{ fontFamily: "'Lato', sans-serif" }}>Lato — ¿El rápido fox brinca?</option>
                  <option value="Montserrat" style={{ fontFamily: "'Montserrat', sans-serif" }}>Montserrat — ¿El rápido fox brinca?</option>
                  <option value="Poppins" style={{ fontFamily: "'Poppins', sans-serif" }}>Poppins — ¿El rápido fox brinca?</option>
                  <option value="Nunito" style={{ fontFamily: "'Nunito', sans-serif" }}>Nunito — ¿El rápido fox brinca?</option>
                  <option value="Work Sans" style={{ fontFamily: "'Work Sans', sans-serif" }}>Work Sans — ¿El rápido fox brinca?</option>
                  <option value="DM Sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>DM Sans — ¿El rápido fox brinca?</option>
                  <option value="Plus Jakarta Sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Plus Jakarta Sans — ¿El rápido fox brinca?</option>
                </select>
                <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: 6 }}>
                  Cada opción se muestra con su propia apariencia. Al guardar, el cambio se aplica en toda la aplicación.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ background: primaryColor, color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>{saving ? "Guardando..." : "Guardar Personalización"}</button>
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
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Ingresa tu contraseña actual"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repite la nueva contraseña"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
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
