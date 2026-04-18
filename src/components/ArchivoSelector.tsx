"use client";

import { useEffect, useState, useCallback } from "react";

type Archivo = {
  id: number;
  nombre: string;
  fecha_corte: string;
  total_ciudadanos: number;
};

interface ArchivoSelectorProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export default function ArchivoSelector({ value, onChange, compact }: ArchivoSelectorProps) {
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArchivos = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/archivos", { headers });
      const data = await res.json();
      setArchivos(data.archivos || []);
    } catch (err) {
      console.error("Error cargando archivos:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadArchivos();
  }, [loadArchivos]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    localStorage.setItem("archivoSeleccionado", newValue);
  };

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "#64748b", padding: "4px 0" }}>
        Cargando épocas...
      </div>
    );
  }

  const currentArchivo = archivos.find(a => String(a.id) === value);

  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        Época Electoral
      </label>
      <select
        value={value}
        onChange={handleChange}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: compact ? "6px 10px" : "8px 12px",
          color: "#f8fafc",
          fontSize: compact ? 11 : 13,
          outline: "none",
          width: "100%",
          minWidth: compact ? 180 : 220,
          fontWeight: 600,
        }}
      >
        <option value="actual">📍 Época Actual (Datos Activos)</option>
        {archivos.map((a) => (
          <option key={a.id} value={String(a.id)}>
            📁 {a.nombre} ({new Date(a.fecha_corte).toLocaleDateString("es-CO")} - {a.total_ciudadanos} registros)
          </option>
        ))}
      </select>
      {currentArchivo && (
        <div style={{ fontSize: 10, color: "#6366f1", marginTop: 4, fontWeight: 600 }}>
          Viendo: {currentArchivo.nombre}
        </div>
      )}
      {value === "actual" && (
        <div style={{ fontSize: 10, color: "#10b981", marginTop: 4, fontWeight: 600 }}>
          Modo: Captación activa
        </div>
      )}
    </div>
  );
}
