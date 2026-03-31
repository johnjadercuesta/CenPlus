"use client";

import { useState, useEffect } from "react";
import { SEXO_OPTIONS, NIVEL_ESTUDIOS_OPTIONS } from "@/types/ciudadano";
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
    barrio: "",
    corregimiento: "",
    vereda: "",
    es_lider: "No",
    nombre_lider: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [lideres, setLideres] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedLiderId, setSelectedLiderId] = useState<string>("");
  const [sectores, setSectores] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Fetch sectores (barrios) for the dropdown
    fetch("/api/sectores", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setSectores(res.data.map((s: { id: number; nombre: string }) => ({ id: s.id, nombre: s.nombre })));
      })
      .catch(() => {});

    // Fetch auth + líderes
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.role === "administrador") {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const geoRes = await fetch(
        `/api/geocode?barrio=${encodeURIComponent(form.barrio)}&corregimiento=${encodeURIComponent(form.corregimiento)}&vereda=${encodeURIComponent(form.vereda)}`
      );
      const geoData = await geoRes.json();

      const body: Record<string, unknown> = {
        ...form,
        edad: form.edad ? parseInt(form.edad) : null,
        es_lider: form.es_lider === "Sí",
        latitud: geoData.latitud,
        longitud: geoData.longitud,
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
          text: `Registro exitoso. ${geoData.latitud ? "Ubicación geocodificada." : "Ubicación no encontrada, se puede actualizar después."}`,
        });
        setForm({
          id_unico: "",
          nombre_completo: "",
          telefono: "",
          sexo: "",
          edad: "",
          nivel_estudios: "",
          ocupacion: "",
          barrio: "",
          corregimiento: "",
          vereda: "",
          es_lider: "No",
          nombre_lider: "",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión. Intente nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  const fieldCount = Object.values(form).filter(v => v && v !== "No").length;
  const totalFields = 10;
  const progressPct = Math.round((fieldCount / totalFields) * 100);

  return (
    <form onSubmit={handleSubmit}>
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
          animation: "fadeIn 0.3s ease",
        }}>
          <span style={{ fontSize: 20 }}>{message.type === "success" ? "✅" : "❌"}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? "#15803d" : "#b91c1c", flex: 1 }}>
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>✕</button>
        </div>
      )}

      {/* Progress indicator */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
        padding: "12px 18px",
        background: "#f8fafc",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
      }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: "50%",
          background: `conic-gradient(#3b82f6 ${progressPct * 3.6}deg, #e2e8f0 0deg)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: "50%",
            background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#3b82f6",
          }}>
            {progressPct}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Progreso del Formulario</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{fieldCount} de {totalFields} campos completados</div>
        </div>
        <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginLeft: 8 }}>
          <div style={{
            width: `${progressPct}%`,
            height: "100%",
            background: progressPct >= 80 ? "#16a34a" : progressPct >= 40 ? "#3b82f6" : "#f59e0b",
            borderRadius: 3,
            transition: "width 0.4s ease, background 0.4s ease",
          }} />
        </div>
      </div>

      {/* SECTION: Identificación */}
      <SectionHeader icon="👤" title="Identificación Personal" subtitle="Datos básicos del ciudadano" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Cédula de Ciudadanía" required>
          <input
            type="text"
            name="id_unico"
            value={form.id_unico}
            onChange={handleChange}
            required
            inputMode="numeric"
            placeholder="Número de cédula"
            className="input"
          />
        </FormField>

        <FormField label="Nombre Completo" required>
          <input
            type="text"
            name="nombre_completo"
            value={form.nombre_completo}
            onChange={handleChange}
            required
            placeholder="Nombres y apellidos"
            className="input"
          />
        </FormField>

        <FormField label="Teléfono">
          <input
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            inputMode="tel"
            placeholder="Número de teléfono"
            className="input"
          />
        </FormField>

        <FormField label="Sexo">
          <select name="sexo" value={form.sexo} onChange={handleChange} className="input" style={{ background: "white" }}>
            <option value="">Seleccionar...</option>
            {SEXO_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Edad">
          <input
            type="number"
            name="edad"
            value={form.edad}
            onChange={handleChange}
            min="1"
            max="149"
            inputMode="numeric"
            placeholder="Edad"
            className="input"
          />
        </FormField>

        <FormField label="Nivel de Estudios">
          <select name="nivel_estudios" value={form.nivel_estudios} onChange={handleChange} className="input" style={{ background: "white" }}>
            <option value="">Seleccionar...</option>
            {NIVEL_ESTUDIOS_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </FormField>

        <div style={{ gridColumn: "1 / -1" }}>
          <FormField label="Ocupación">
            <input
              type="text"
              name="ocupacion"
              value={form.ocupacion}
              onChange={handleChange}
              placeholder="Ej: Agricultor, Comerciante, Estudiante..."
              className="input"
            />
          </FormField>
        </div>
      </div>

      {/* SECTION: Ubicación */}
      <SectionHeader icon="📍" title="Ubicación Geográfica" subtitle="Seleccione el sector/barrio definido por el administrador" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="Barrio (Sector)" required>
          <select
            name="barrio"
            value={form.barrio}
            onChange={handleChange}
            required
            className="input"
            style={{ background: "white" }}
          >
            <option value="">Seleccionar sector...</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>
          {sectores.length === 0 && (
            <span style={{ fontSize: 11, color: "#f59e0b", marginTop: 4, display: "block" }}>
              No hay sectores creados. Un administrador debe crearlos primero.
            </span>
          )}
        </FormField>

        <FormField label="Corregimiento" required>
          <input
            type="text"
            name="corregimiento"
            value={form.corregimiento}
            onChange={handleChange}
            required
            placeholder="Nombre del corregimiento"
            className="input"
          />
        </FormField>

        <FormField label="Vereda">
          <input
            type="text"
            name="vereda"
            value={form.vereda}
            onChange={handleChange}
            placeholder="Nombre de la vereda"
            className="input"
          />
        </FormField>
      </div>

      {/* SECTION: Liderazgo */}
      <SectionHeader icon="⭐" title="Información de Liderazgo" subtitle="Relación con líderes comunitarios" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <FormField label="¿Es líder comunitario?">
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            {["Sí", "No"].map((opt) => (
              <label
                key={opt}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  background: form.es_lider === opt
                    ? opt === "Sí" ? "#eff6ff" : "#f8fafc"
                    : "white",
                  color: form.es_lider === opt
                    ? opt === "Sí" ? "#1d4ed8" : "#475569"
                    : "#94a3b8",
                  borderRight: opt === "Sí" ? "1px solid #e2e8f0" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name="es_lider"
                  value={opt}
                  checked={form.es_lider === opt}
                  onChange={handleChange}
                  style={{ display: "none" }}
                />
                {form.es_lider === opt && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: opt === "Sí" ? "#3b82f6" : "#94a3b8",
                  }} />
                )}
                {opt}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Nombre del líder a cargo">
          <input
            type="text"
            name="nombre_lider"
            value={form.nombre_lider}
            onChange={handleChange}
            placeholder="Nombre del líder que hace seguimiento"
            className="input"
          />
        </FormField>

        {isAdmin && lideres.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField label="Registrado por (líder)">
              <select
                value={selectedLiderId}
                onChange={(e) => setSelectedLiderId(e.target.value)}
                className="input"
                style={{ background: "white" }}
              >
                <option value="">Admin actual</option>
                {lideres.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{
          width: "100%",
          justifyContent: "center",
          padding: "16px 24px",
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 12,
          position: "relative",
          overflow: "hidden",
          opacity: loading ? 0.7 : 1,
          transition: "all 0.2s ease",
          boxShadow: "0 4px 14px rgba(30, 58, 95, 0.3)",
        }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 18, height: 18,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTop: "2px solid white",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              display: "inline-block",
            }} />
            Registrando...
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Enviar Registro
          </span>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </form>
  );
}

// --- Sub-components ---

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid #e2e8f0",
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#475569",
        marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
