"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { Sector, MapaCalorProps } from "@/types/ciudadano";
import { getToken, authHeaders } from "@/lib/api";

export default function MapaCalor({ ciudadanos, meta = 1000 }: MapaCalorProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const leafletLibRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [viewMode, setViewMode] = useState<"heatmap" | "sectores" | "ambos">("ambos");
  const [showPoints, setShowPoints] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<{ type: string; text: string } | null>(null);

  // Auth helpers imported from @/lib/api

  const refreshSectores = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDeleteSector = async (id: number) => {
    if (!confirm("¿Eliminar este sector?")) return;
    try {
      const res = await fetch(`/api/sectores/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      const text = await res.text();
      let json: any = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = { error: text }; }
      if (!res.ok) {
        console.error("[handleDeleteSector] Error:", res.status, json);
        setFeedback({ type: "error", text: json.error || `Error ${res.status} al eliminar` });
      } else {
        setFeedback({ type: "success", text: "Sector eliminado" });
        refreshSectores();
      }
    } catch (err) {
      console.error("[handleDeleteSector] Excepción:", err);
      setFeedback({ type: "error", text: `Error de conexión: ${(err as Error).message}` });
    }
  };

  const filteredData = ciudadanos.filter((c) => c.latitud && c.longitud);
  const porcentaje = filteredData.length > 0 ? Math.round((filteredData.length / meta) * 100) : 0;

  const getGoalColor = (pct: number) => {
    if (pct >= 80) return "#2563eb";
    if (pct >= 30) return "#f59e0b";
    return "#ef4444";
  };

  const getGoalGradient = () => {
    if (porcentaje >= 80) {
      return { 0.0: "#1e3a8a", 0.25: "#1d4ed8", 0.5: "#3b82f6", 0.75: "#60a5fa", 1.0: "#bfdbfe" };
    }
    if (porcentaje >= 30) {
      return { 0.0: "#78350f", 0.25: "#b45309", 0.5: "#f59e0b", 0.75: "#fbbf24", 1.0: "#fef3c7" };
    }
    return { 0.0: "#7f1d1d", 0.25: "#b91c1c", 0.5: "#ef4444", 0.75: "#f87171", 1.0: "#fecaca" };
  };

  // Fetch sectores - re-fetch when refreshKey changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/sectores/stats", { headers: h, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setSectores(data.sectorStats || []))
      .catch(() => {});
  }, [refreshKey]);

  // Auto-refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSectores();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshSectores]);

  // Init map
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    const loadMap = async () => {
      if (typeof window === "undefined") return;
      if (leafletLibRef.current) return;
      
      const leaflet = await import("leaflet");
      const L = leaflet.default;
      (window as any).L = L;
      
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
      
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      leafletLibRef.current = L;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView([4.5709, -74.2973], 6);

      // Better tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;
      leafletLibRef.current = L;
      setMapReady(true);

      // Fit bounds only on initial load with sectors
      setTimeout(() => {
        if (!cancelled && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          if (filteredData.length > 0) {
            const allPts = filteredData.map((c) => [c.latitud!, c.longitud!] as [number, number]);
            if (allPts.length > 0) {
              const bounds = L.latLngBounds(allPts);
              mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
            }
          }
        }
      }, 500);
    };

    loadMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      mapInstanceRef.current = null;
      leafletLibRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update layers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const L = leafletLibRef.current;
    if (!L) return;

    // Clear old layers
    layersRef.current.forEach((l) => {
      try { mapInstanceRef.current.removeLayer(l); } catch {}
    });
    layersRef.current = [];

    // Individual point markers
    if (showPoints && filteredData.length > 0 && filteredData.length <= 500) {
      const pointGroup = L.featureGroup();
      filteredData.forEach((c) => {
        const isLider = c.es_lider;
        const color = isLider ? "#f59e0b" : "#3b82f6";
        const radius = isLider ? 6 : 4;

        const marker = L.circleMarker([c.latitud!, c.longitud!], {
          radius: radius,
          fillColor: color,
          color: "#fff",
          weight: 1,
          fillOpacity: 0.8,
        });

        marker.bindPopup(
          '<div style="font-family:Inter,sans-serif;font-size:12px;padding:4px">' +
          (isLider ? '<span style="padding:2px 8px;background:#fef3c7;color:#d97706;border-radius:10px;font-size:10px;font-weight:600">Líder Comunitario</span>' : '<span style="color:#64748b">Ciudadano</span>') +
          '</div>'
        );

        pointGroup.addLayer(marker);
      });
      pointGroup.addTo(mapInstanceRef.current);
      layersRef.current.push(pointGroup);
    }

    // Heatmap layer
    if (viewMode === "heatmap" || viewMode === "ambos") {
      if (filteredData.length > 0 && (L as any).heatLayer) {
        const points = filteredData.map((c) => [c.latitud!, c.longitud!, 0.8] as [number, number, number]);
        const heat = (L as any).heatLayer(points, {
          radius: 35,
          blur: 25,
          maxZoom: 17,
          max: 1.0,
          gradient: getGoalGradient(),
        }).addTo(mapInstanceRef.current);
        layersRef.current.push(heat);
      }
    }

    // Sector zones (polygons or circles) with labels
    if (viewMode === "sectores" || viewMode === "ambos") {
      sectores.forEach((s) => {
        const pct = s.porcentaje || 0;
        const color = pct >= 80 ? "#2563eb" : pct >= 30 ? "#f59e0b" : "#ef4444";

        const popupHTML = `
          <div style="font-family:Inter,sans-serif;min-width:240px;padding:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}66"></div>
              <span style="font-size:15px;font-weight:700;color:#0f172a">${s.nombre}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:12px;color:#64748b">Registros</span>
              <span style="font-size:12px;font-weight:700;color:${color}">${s.registros || 0} / ${s.meta}</span>
            </div>
            <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
              <div style="width:${Math.min(pct, 100)}%;height:100%;background:${color};border-radius:4px;transition:width 0.5s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;margin-bottom:10px">
              <span style="font-size:10px;color:#94a3b8">${s.poligono ? "Polígono" : s.radio/1000 + "km radio"}</span>
              <span style="font-size:12px;font-weight:800;color:${color}">${pct}%</span>
            </div>
            <div style="display:flex;gap:6px;border-top:1px solid #e2e8f0;padding-top:8px">
              <button id="edit-sector-${s.id}" style="flex:1;padding:6px 12px;border:none;border-radius:6px;background:#f1f5f9;color:#1e3a5f;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Editar</button>
              <button id="delete-sector-${s.id}" style="flex:1;padding:6px 12px;border:none;border-radius:6px;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Eliminar</button>
            </div>
          </div>
        `;

        let shape: any;
        if (s.poligono && Array.isArray(s.poligono) && s.poligono.length >= 3) {
          shape = L.polygon(s.poligono, { color, fillColor: color, fillOpacity: 0.15, weight: 2.5 }).addTo(mapInstanceRef.current);
        } else {
          L.circle([s.latitud, s.longitud], { radius: s.radio * 1.1, color, fillColor: color, fillOpacity: 0.05, weight: 0 }).addTo(mapInstanceRef.current);
          shape = L.circle([s.latitud, s.longitud], { radius: s.radio, color, fillColor: color, fillOpacity: 0.12, weight: 2.5, dashArray: "8,6" }).addTo(mapInstanceRef.current);
        }

        shape.bindPopup(popupHTML, { className: "custom-popup" });
        shape.on("popupopen", () => {
          const editBtn = document.getElementById(`edit-sector-${s.id}`);
          const deleteBtn = document.getElementById(`delete-sector-${s.id}`);
          if (editBtn) editBtn.onclick = () => router.push(`/dashboard/sectores?edit=${s.id}`);
          if (deleteBtn) deleteBtn.onclick = () => handleDeleteSector(s.id);
        });
        layersRef.current.push(shape);

        // Sector label badge
        const label = L.marker([s.latitud, s.longitud], {
          icon: L.divIcon({
            className: "",
            html: `<div style="
              background: linear-gradient(135deg, ${color}, ${color}dd);
              color:white;
              padding:6px 14px;
              border-radius:24px;
              font-size:12px;
              font-weight:700;
              font-family:Inter,sans-serif;
              white-space:nowrap;
              box-shadow: 0 4px 14px ${color}44, 0 1px 3px rgba(0,0,0,0.1);
              text-align:center;
              border: 2px solid white;
              line-height:1.3;
            ">
              <span style="font-size:13px">${s.nombre}</span><br/>
              <span style="font-size:11px;opacity:0.95">${pct}%  ·  ${s.registros || 0}/${s.meta}</span>
            </div>`,
            iconSize: [140, 50],
            iconAnchor: [70, 25],
          }),
        }).addTo(mapInstanceRef.current);

        layersRef.current.push(label);
      });
    }
  }, [mapReady, viewMode, showPoints, filteredData.length, sectores, porcentaje, refreshKey]);

  const goalColor = getGoalColor(porcentaje);

  return (
    <div>
      {feedback && (
        <div style={{
          padding: "10px 16px", marginBottom: 10, borderRadius: 8,
          borderLeft: `4px solid ${feedback.type === "success" ? "#16a34a" : "#dc2626"}`,
          background: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: feedback.type === "success" ? "#16a34a" : "#dc2626" }}>
            {feedback.text}
          </span>
          <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>&#10005;</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12,
        padding: "10px 14px",
        background: "#f8fafc",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["heatmap", "sectores", "ambos"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: viewMode === mode ? "#1e3a5f" : "white",
                color: viewMode === mode ? "white" : "#64748b",
                boxShadow: viewMode === mode ? "0 2px 8px rgba(30,58,95,0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
            >
              {mode === "heatmap" ? "Mapa de Calor" : mode === "sectores" ? "Sectores" : "Ambos"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              style={{ accentColor: "#1e3a5f" }}
            />
            Puntos
          </label>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: goalColor,
            boxShadow: `0 0 8px ${goalColor}66`,
          }} />
          <span style={{ color: goalColor, fontWeight: 700, fontSize: 13 }}>
            {filteredData.length}/{meta} — {porcentaje}% de meta
          </span>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 600,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      />

      {/* Legend bar */}
      <div style={{
        display: "flex",
        gap: 20,
        marginTop: 10,
        justifyContent: "center",
        flexWrap: "wrap",
        padding: "8px 16px",
        background: "#f8fafc",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 4px #2563eb66" }} />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Azul: ≥80% meta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 4px #f59e0b66" }} />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Amarillo: 30-80%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 4px #ef444466" }} />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Rojo: &lt;30% meta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", border: "1px solid white" }} />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Punto ciudadano</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", border: "1px solid white" }} />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Punto líder</span>
        </div>
      </div>
    </div>
  );
}
