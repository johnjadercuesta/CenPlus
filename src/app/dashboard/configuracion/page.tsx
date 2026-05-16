"use client";

import { useState, useEffect } from "react";
import { authHeadersWithJson } from "@/lib/api";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"territorio" | "referencias" | "marca">("territorio");
  const [comunas, setComunas] = useState<any[]>([]);
  const [barrios, setBarrios] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [problematicas, setProblematicas] = useState<any[]>([]);
  const [comunaFilterId, setComunaFilterId] = useState<string>("");

  // Branding states
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");
  const [metaGlobal, setMetaGlobal] = useState("1000");

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

  const loadThemeConfig = async () => {
    try {
      const res = await fetch("/api/tenant/config");
      const data = await res.json();
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.logo_url) setLogoUrl(data.logo_url);
      
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
    try {
      const res = await fetch("/api/tenant/config/update", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: primaryColor,
          logo_url: logoUrl || null
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Marca actualizada. Recargando..." });
        document.documentElement.style.setProperty('--brand-accent', primaryColor);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Error al guardar" });
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
          color: message.type === "success" ? "#15803d" : "#b91c1c"
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => setActiveTab("territorio")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "territorio" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "territorio" ? 700 : 500, color: activeTab === "territorio" ? "#3b82f6" : "#64748b" }}>📍 Territorio</button>
        <button onClick={() => setActiveTab("referencias")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "referencias" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "referencias" ? 700 : 500, color: activeTab === "referencias" ? "#3b82f6" : "#64748b" }}>⚙️ Referencias</button>
        <button onClick={() => setActiveTab("marca")} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "marca" ? "2px solid #3b82f6" : "none", fontWeight: activeTab === "marca" ? 700 : 500, color: activeTab === "marca" ? "#3b82f6" : "#64748b" }}>🎨 Marca y Estilo</button>
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

        {activeTab === "marca" && (
          <div className="card" style={{ background: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", maxWidth: "800px" }}>
            <form onSubmit={handleSaveBranding}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Color de la Aplicación</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: "50px", height: "50px", border: "none", cursor: "pointer" }} />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ flex: 1, padding: "8px", border: "1px solid #ccc" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Logo Corporativo</label>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: "12px" }} />
                  <div style={{ padding: "16px", border: "2px dashed #e2e8f0", borderRadius: "8px", textAlign: "center" }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxHeight: "80px", maxWidth: "100%" }} /> : <span style={{ color: "#94a3b8" }}>Sin logo</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ background: primaryColor, color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>{saving ? "Guardando..." : "Guardar Personalización"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
