"use client";

import { useState, useEffect } from "react";
import { 
  SEXO_OPTIONS, 
  NIVEL_ESTUDIOS_OPTIONS, 
  REGIMEN_SALUD_OPTIONS,
  Comuna,
  Barrio,
  PuestoVotacion,
  ProblematicaSocial
} from "@/types/ciudadano";
import { getToken, authHeadersWithJson } from "@/lib/api";

export default function FormularioCiudadano() {
  const [form, setForm] = useState({
    id_unico: "",
    nombre_completo: "",
    telefono: "",
    sexo: "",
    edad: "",
    nivel_estudios: "",
    ocupacion: "",
    regimen_salud: "",
    puesto_votacion: "",
    problematica_principal: "",
    zona: "urbana", // New field
    id_comuna: "",
    id_barrio: "",
    barrio: "",
    corregimiento: "",
    vereda: "",
    es_lider: "No",
    nombre_lider: "",
    latitud: null as number | null,
    longitud: null as number | null,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [lideres, setLideres] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedLiderId, setSelectedLiderId] = useState<string>("");

  // Listas de referencia dinámicas
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [puestos, setPuestos] = useState<PuestoVotacion[]>([]);
  const [problematicas, setProblematicas] = useState<ProblematicaSocial[]>([]);

  // Obtener GPS automáticamente al cargar el formulario
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(prev => ({ 
            ...prev, 
            latitud: pos.coords.latitude, 
            longitud: pos.coords.longitude 
          }));
        },
        (err) => console.warn("GPS no disponible:", err.message),
        { enableHighAccuracy: true }
      );
    }

    const h = authHeadersWithJson();
    fetch("/api/territorio/puestos", { headers: h }).then(r => r.json()).then(res => setPuestos(res.data || [])).catch(() => {});
    fetch("/api/territorio/problematicas", { headers: h }).then(r => r.json()).then(res => setProblematicas(res.data || [])).catch(() => {});

    const token = getToken();
    if (!token) return;

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && (data.role === "administrador" || data.role === "estratega")) {
          setIsAdmin(true);
          fetch("/api/lideres", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((res) => {
              if (res.data) setLideres(res.data);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Fetch de comunas/corregimientos cuando cambia la zona
  useEffect(() => {
    fetch(`/api/territorio/comunas?tipo=${form.zona}`, { headers: authHeadersWithJson() })
      .then(r => r.json())
      .then(res => setComunas(res.data || []))
      .catch(() => {});
  }, [form.zona]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "zona") {
        setForm(prev => ({ 
            ...prev, 
            zona: value, 
            id_comuna: "", 
            id_barrio: "", 
            barrio: "", 
            corregimiento: "", 
            vereda: "" 
        }));
        setBarrios([]);
    } else if (name === "id_comuna") {
      const selectedObj = comunas.find(c => String(c.id) === value);
      setForm(prev => ({ 
        ...prev, 
        id_comuna: value, 
        corregimiento: selectedObj?.nombre || "",
        id_barrio: "", 
        barrio: "",
        vereda: ""
      }));
      if (value) {
        fetch(`/api/territorio/barrios?comunaId=${value}`, { headers: authHeadersWithJson() })
          .then(r => r.json())
          .then(res => setBarrios(res.data || []))
          .catch(() => {});
      } else {
        setBarrios([]);
      }
    } else if (name === "id_barrio") {
      const selectedBarrio = barrios.find(b => String(b.id) === value);
      setForm(prev => ({ 
        ...prev, 
        id_barrio: value, 
        barrio: selectedBarrio?.nombre || "",
        vereda: selectedBarrio?.nombre || ""
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!form.latitud || !form.longitud) {
      if (!confirm("No se han capturado coordenadas GPS exactas. ¿Desea continuar de todos modos?")) {
        setLoading(false);
        return;
      }
    }

    try {
      const body: Record<string, unknown> = {
        ...form,
        edad: form.edad ? parseInt(form.edad) : null,
        es_lider: form.es_lider === "Sí",
        timestamp: new Date().toISOString(),
      };

      if (isAdmin && selectedLiderId) {
        body.lider_id = parseInt(selectedLiderId);
      }

      const res = await fetch("/api/ciudadanos", {
        method: "POST",
        headers: authHeadersWithJson(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al registrar" });
      } else {
        setMessage({
          type: "success",
          text: `Registro territorial exitoso. GPS Validado: ${form.latitud ? "Sí" : "No"}.`,
        });
        handleResetForm();
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setForm({
      id_unico: "",
      nombre_completo: "",
      telefono: "",
      sexo: "",
      edad: "",
      nivel_estudios: "",
      ocupacion: "",
      regimen_salud: "",
      puesto_votacion: "",
      problematica_principal: "",
      zona: "urbana",
      id_comuna: "",
      id_barrio: "",
      barrio: "",
      corregimiento: "",
      vereda: "",
      es_lider: "No",
      nombre_lider: "",
      latitud: form.latitud,
      longitud: form.longitud,
    });
    setBarrios([]);
  };

  return (
    <form onSubmit={handleSubmit} style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Feedback message */}
      {message && (
        <div style={{
          padding: "14px 18px",
          borderRadius: 10,
          marginBottom: 20,
          borderLeft: `4px solid ${message.type === "success" ? "#16a34a" : "#dc2626"}`,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>{message.type === "success" ? "✅" : "❌"}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? "#15803d" : "#b91c1c", flex: 1 }}>
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
        </div>
      )}

      {/* GPS Status */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
        padding: "12px 18px",
        background: form.latitud ? "#f0fdf4" : "#fef2f2",
        borderRadius: 10,
        border: `1px solid ${form.latitud ? "#bbf7d0" : "#fecaca"}`,
      }}>
        <div style={{ fontSize: 18 }}>{form.latitud ? "🧭" : "🚫"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: form.latitud ? "#15803d" : "#b91c1c" }}>
            {form.latitud ? "Coordenadas capturadas" : "Esperando señal GPS..."}
          </div>
          <div style={{ fontSize: 11, color: form.latitud ? "#16a34a" : "#dc2626" }}>
            {form.latitud ? `${form.latitud.toFixed(6)}, ${form.longitud?.toFixed(6)}` : "Habilite la ubicación en su navegador."}
          </div>
        </div>
      </div>

      {/* SECTION: Identificación */}
      <SectionHeader icon="👤" title="Identificación y Perfil" subtitle="Datos básicos y demográficos" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Cédula de Ciudadanía" required>
          <input type="text" name="id_unico" value={form.id_unico} onChange={handleChange} required inputMode="numeric" placeholder="Número de cédula" className="input" />
        </FormField>
        <FormField label="Nombre Completo" required>
          <input type="text" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} required placeholder="Nombres y apellidos" className="input" />
        </FormField>
        <FormField label="Sexo">
          <select name="sexo" value={form.sexo} onChange={handleChange} className="input">
            <option value="">Seleccionar...</option>
            {SEXO_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Edad Real" required>
          <input type="number" name="edad" value={form.edad} onChange={handleChange} required min="1" max="149" className="input" />
        </FormField>
      </div>

      {/* SECTION: Territorial */}
      <SectionHeader icon="📍" title="Ubicación Territorial" subtitle="Estructura dinámica urbana/rural" />

      {/* Selector de Zona */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Zona de Residencia</label>
        <div style={{ display: "flex", gap: 10 }}>
            {['urbana', 'rural'].map(z => (
                <button
                    key={z}
                    type="button"
                    onClick={() => handleChange({ target: { name: "zona", value: z } } as any)}
                    style={{
                        flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0",
                        background: form.zona === z ? "#6366f1" : "white",
                        color: form.zona === z ? "white" : "#64748b",
                        fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                >
                    {z.toUpperCase()}
                </button>
            ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label={form.zona === 'urbana' ? "Comuna (Sector)" : "Corregimiento"} required>
          <select name="id_comuna" value={form.id_comuna} onChange={handleChange} required className="input">
            <option value="">Seleccionar...</option>
            {comunas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </FormField>

        <FormField label={form.zona === 'urbana' ? "Barrio" : "Vereda"} required>
          <select 
            name="id_barrio" 
            value={form.id_barrio} 
            onChange={handleChange} 
            required 
            disabled={!form.id_comuna}
            className="input" 
            style={{ background: form.id_comuna ? "white" : "#f1f5f9" }}
          >
            <option value="">Seleccionar...</option>
            {barrios.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* SECTION: Electoral y Social */}
      <SectionHeader icon="📊" title="Estratégico y Social" subtitle="Análisis de entorno y elecciones" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Puesto de Votación Referencia">
          <select name="puesto_votacion" value={form.puesto_votacion} onChange={handleChange} className="input">
            <option value="">Seleccionar puesto...</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Problemática Social Dominante">
          <select name="problematica_principal" value={form.problematica_principal} onChange={handleChange} className="input">
            <option value="">Seleccionar problemática...</option>
            {problematicas.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </FormField>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "16px", borderRadius: 12, fontWeight: 700 }}>
        {loading ? "Procesando..." : "Finalizar Registro"}
      </button>

      <style jsx>{`
        .input { border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 14px; width: 100%; }
        .input:focus { outline: none; border-color: #6366f1; }
      `}</style>
    </form>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{subtitle}</div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
