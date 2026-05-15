"use client";

import { useEffect, useState } from "react";

export default function ConfiguracionMarca() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const DEFAULT_PRIMARY = "#3b82f6";
  const DEFAULT_SECONDARY = "#6366f1";

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/tenant/config");
        const data = await res.json();
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.secondary_color) setSecondaryColor(data.secondary_color);
        if (data.logo_url) setLogoUrl(data.logo_url);
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/tenant/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl || null
        }),
      });

      if (res.ok) {
        setMessage({ text: "¡Personalización guardada con éxito! Refresca la página para ver los cambios aplicados en todo el sistema.", type: "success" });
        // Aplicar inmediatamente al :root para previsualizar
        document.documentElement.style.setProperty('--brand-accent', primaryColor);
      } else {
        const err = await res.json();
        setMessage({ text: err.error || "Error al guardar", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor(DEFAULT_PRIMARY);
    setSecondaryColor(DEFAULT_SECONDARY);
    setLogoUrl("");
  };

  if (loading) return <div style={{ padding: 40 }}>Cargando configuración de marca...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <div className="main-header" style={{ marginBottom: 32, padding: 0, background: "none", border: "none" }}>
        <div>
          <h1 className="main-header-title">Personalización de Marca</h1>
          <p className="main-header-subtitle">Configura los colores y el logo de tu organización</p>
        </div>
      </div>

      <div className="card animate-in">
        <form onSubmit={handleSave} className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
            
            {/* Sección de Colores */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1e293b" }}>Colores Corporativos</h3>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                  Color Primario (Botones, Acentos, Sidebar)
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 50, height: 50, border: "none", borderRadius: 8, cursor: "pointer" }}
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="input"
                    style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                  Color Secundario (Gradientes y Detalles)
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input 
                    type="color" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{ width: 50, height: 50, border: "none", borderRadius: 8, cursor: "pointer" }}
                  />
                  <input 
                    type="text" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="input"
                    style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                  />
                </div>
              </div>
            </div>

            {/* Sección de Logo */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1e293b" }}>Logo de Organización</h3>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                  URL del Logo (Imagen PNG o SVG)
                </label>
                <input 
                  type="url" 
                  value={logoUrl} 
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-logo.png"
                  className="input"
                />
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  Se recomienda un logo con fondo transparente.
                </p>
              </div>

              {/* Previsualización del Logo */}
              <div style={{ 
                height: 120, 
                background: "#f8fafc", 
                borderRadius: 12, 
                border: "2px dashed #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Previsualización" style={{ maxHeight: "80%", maxWidth: "80%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Sin logo personalizado</span>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 32px" }} />

          {/* Previsualización de Botones con el nuevo color */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Previsualización de Componentes</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" className="btn" style={{ background: primaryColor, color: "white" }}>Botón Primario</button>
              <button type="button" className="btn" style={{ border: `1px solid ${primaryColor}`, color: primaryColor, background: "none" }}>Botón Esquema</button>
              <div style={{ padding: "8px 16px", borderRadius: 20, background: `${primaryColor}20`, color: primaryColor, fontSize: 12, fontWeight: 700 }}>Badge de Estado</div>
            </div>
          </div>

          {message.text && (
            <div style={{ 
              padding: "16px", 
              borderRadius: 12, 
              background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: message.type === "success" ? "#065f46" : "#991b1b",
              marginBottom: 24,
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${message.type === "success" ? "#10b981" : "#f87171"}`
            }}>
              {message.type === "success" ? "✅" : "⚠️"} {message.text}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button 
              type="button" 
              onClick={handleReset}
              style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Restablecer a colores originales de CenPlus
            </button>
            
            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary"
              style={{ background: primaryColor, padding: "12px 32px" }}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginTop: 40, padding: 24, background: "#fefce8", borderRadius: 12, border: "1px solid #fef08a" }}>
        <h4 style={{ margin: "0 0 8px", color: "#854d0e", fontSize: 14, fontWeight: 700 }}>Nota Importante</h4>
        <p style={{ margin: 0, color: "#a16207", fontSize: 13, lineHeight: 1.5 }}>
          Los cambios realizados aquí afectarán a todos los usuarios de tu organización (Analistas y Líderes). 
          El logo aparecerá en el menú lateral y los colores se aplicarán a todos los botones y gráficas.
        </p>
      </div>
    </div>
  );
}
