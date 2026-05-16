"use client";

import { useEffect, useState } from "react";
import MapaCalor from "@/components/MapaCalor";
import ArchivoSelector from "@/components/ArchivoSelector";

export default function MapaPage() {
  const [ciudadanos, setCiudadanos] = useState<{latitud: number | null; longitud: number | null; es_lider: boolean}[]>([]);
  const [meta, setMeta] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [archivoId, setArchivoId] = useState(() => localStorage.getItem("archivoSeleccionado") || "actual");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const params = archivoId !== "actual" ? `?archivo_id=${archivoId}` : "";
    Promise.all([
      fetch(`/api/ciudadanos/coords${params}`, { headers, cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/config${params}`, { headers, cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([cJson, cfgJson]) => {
        setCiudadanos(cJson.data || []);
        setMeta(parseInt(cfgJson.config?.meta_global || "1000"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [archivoId]);

  const conCoords = ciudadanos.filter((c) => c.latitud && c.longitud);
  const lideres = conCoords.filter((c) => c.es_lider);

  return (
    <div>
      <div className="main-header">
        <div>
          <h1 className="main-header-title">ðŸ‘¥ Mapa Territorial</h1>
          <p className="main-header-subtitle">VisualizaciÃ³n de densidad y metas por zona</p>
        </div>
        <div style={{ minWidth: 220 }}>
          <ArchivoSelector value={archivoId} onChange={setArchivoId} compact />
        </div>
      </div>
      <div className="main-content">
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div className="metric-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Total registros</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1e3a5f" }}>{ciudadanos.length}</div>
          </div>
          <div className="metric-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Geolocalizados</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{conCoords.length}</div>
          </div>
          <div className="metric-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>LÃ­deres</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#d97706" }}>{lideres.length}</div>
          </div>
          <div className="metric-card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Meta Global</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed" }}>{meta}</div>
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#64748b" }}>Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ padding: 16 }}>
              <MapaCalor ciudadanos={conCoords} meta={meta} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
