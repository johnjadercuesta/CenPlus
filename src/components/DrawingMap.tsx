"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface ReferencePolygon {
  polygon: number[][];
  nombre: string;
}

interface DrawingMapProps {
  onPolygonComplete: (points: number[][]) => void;
  existingPolygon?: number[][] | null;
  referencePolygons?: ReferencePolygon[];
  height?: number;
}

export default function DrawingMap({
  onPolygonComplete,
  existingPolygon,
  referencePolygons = [],
  height = 500,
}: DrawingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const modeRef = useRef<"none" | "drawing" | "editing">("none");
  const pointsRef = useRef<number[][]>(existingPolygon ? [...existingPolygon] : []);
  const polyRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const refLayersRef = useRef<any[]>([]);
  const clickHandlerRef = useRef<any>(null);

  const [mode, setMode] = useState<"none" | "drawing" | "editing">("none");
  const [pointCount, setPointCount] = useState(existingPolygon?.length || 0);
  const [mapReady, setMapReady] = useState(false);

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([4.5709, -74.2973], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      leafletRef.current = L;
      mapInstanceRef.current = map;
      setMapReady(true);
      setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 300);
    };

    init();
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Draw reference polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    refLayersRef.current.forEach((l: any) => { try { mapInstanceRef.current.removeLayer(l); } catch {} });
    refLayersRef.current = [];

    referencePolygons.forEach((ref) => {
      if (!ref.polygon || ref.polygon.length < 3) return;
      const poly = L.polygon(ref.polygon, {
        color: "#cbd5e1", fillColor: "#94a3b8", fillOpacity: 0.06,
        weight: 1.5, dashArray: "4,4", interactive: false,
      }).addTo(mapInstanceRef.current);

      const clat = ref.polygon.reduce((s, p) => s + p[0], 0) / ref.polygon.length;
      const clng = ref.polygon.reduce((s, p) => s + p[1], 0) / ref.polygon.length;
      const label = L.marker([clat, clng], {
        icon: L.divIcon({
          className: "",
          html: '<div style="background:#f8fafc;color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;border:1px solid #e2e8f0;white-space:nowrap">' + ref.nombre + '</div>',
          iconSize: [80, 20], iconAnchor: [40, 10],
        }),
        interactive: false,
      }).addTo(mapInstanceRef.current);

      refLayersRef.current.push(poly, label);
    });

    if (referencePolygons.length > 0) {
      const allPts = referencePolygons.flatMap(r => r.polygon || []);
      if (allPts.length > 0) {
        const bounds = L.latLngBounds(allPts);
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
  }, [referencePolygons, mapReady]);

  // Core: clean up all drawing/editing layers
  const cleanup = () => {
    markersRef.current.forEach((m: any) => { try { mapInstanceRef.current?.removeLayer(m); } catch {} });
    markersRef.current = [];
    if (polyRef.current) { try { mapInstanceRef.current?.removeLayer(polyRef.current); } catch {} polyRef.current = null; }
    if (clickHandlerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.off("click", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (mapInstanceRef.current) mapInstanceRef.current.getContainer().style.cursor = "";
  };

  // Draw/update polygon shape only (no markers)
  const drawPoly = (pts: number[][], color: string) => {
    const L = leafletRef.current;
    if (!L || !mapInstanceRef.current) return;

    if (polyRef.current) {
      // Update existing polygon in place
      if (pts.length >= 3) {
        polyRef.current.setLatLngs(pts);
        polyRef.current.setStyle({ color, fillColor: color });
      }
    } else if (pts.length >= 3) {
      polyRef.current = L.polygon(pts, {
        color, fillColor: color, fillOpacity: 0.12, weight: 2.5,
      }).addTo(mapInstanceRef.current);
    } else if (pts.length >= 2) {
      polyRef.current = L.polyline(pts, {
        color: "#2563eb", weight: 2, dashArray: "6,4",
      }).addTo(mapInstanceRef.current);
    }
  };

  // Create draggable markers (only once per mode entry)
  const createMarkers = (pts: number[][], draggable: boolean) => {
    const L = leafletRef.current;
    if (!L || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m: any) => { try { mapInstanceRef.current.removeLayer(m); } catch {} });
    markersRef.current = [];

    pts.forEach((p, i) => {
      const isFirst = i === 0;
      const marker = L.marker([p[0], p[1]], {
        draggable: draggable,
        autoPan: true,
        icon: L.divIcon({
          className: "",
          html: '<div style="width:' + (isFirst && draggable ? 18 : 14) + 'px;height:' + (isFirst && draggable ? 18 : 14) + 'px;border-radius:50%;background:' + (isFirst ? '#ef4444' : '#2563eb') + ';border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:' + (draggable ? 'grab' : 'default') + '"></div>',
          iconSize: [isFirst && draggable ? 18 : 14, isFirst && draggable ? 18 : 14],
          iconAnchor: [isFirst && draggable ? 9 : 7, isFirst && draggable ? 9 : 7],
        }),
      }).addTo(mapInstanceRef.current);

      if (draggable) {
        marker.on("dragstart", () => {
          marker.getElement()?.style.setProperty("cursor", "grabbing");
        });

        marker.on("drag", (e: any) => {
          const ll = e.target.getLatLng();
          pointsRef.current[i] = [ll.lat, ll.lng];
          // Update polygon directly without re-render
          if (polyRef.current) {
            polyRef.current.setLatLngs(pointsRef.current);
          }
        });

        marker.on("dragend", () => {
          marker.getElement()?.style.setProperty("cursor", "grab");
          setPointCount(pointsRef.current.length);
          onPolygonComplete([...pointsRef.current]);
        });

        marker.on("dblclick", () => {
          if (pointsRef.current.length > 3) {
            cleanup();
            pointsRef.current = pointsRef.current.filter((_, idx) => idx !== i);
            setPointCount(pointsRef.current.length);
            drawPoly(pointsRef.current, "#f59e0b");
            createMarkers(pointsRef.current, true);
            onPolygonComplete([...pointsRef.current]);
          }
        });
      }

      markersRef.current.push(marker);
    });
  };

  // Fit bounds helper
  const fitToPoints = (pts: number[][]) => {
    if (pts.length > 0 && mapInstanceRef.current && leafletRef.current) {
      const bounds = leafletRef.current.latLngBounds(pts);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  // Enter drawing mode
  const startDrawing = () => {
    cleanup();
    pointsRef.current = [];
    setPointCount(0);
    setMode("drawing");

    const map = mapInstanceRef.current;
    const handler = (e: any) => {
      if (modeRef.current !== "drawing") return;
      pointsRef.current.push([e.latlng.lat, e.latlng.lng]);
      setPointCount(pointsRef.current.length);
      drawPoly(pointsRef.current, "#2563eb");
      createMarkers(pointsRef.current, false);
      if (pointsRef.current.length >= 3) {
        fitToPoints(pointsRef.current);
      }
    };
    clickHandlerRef.current = handler;
    map.on("click", handler);
    map.getContainer().style.cursor = "crosshair";
  };

  // Enter editing mode
  const startEditing = () => {
    if (!existingPolygon || existingPolygon.length < 3) return;
    cleanup();
    pointsRef.current = [...existingPolygon];
    setPointCount(pointsRef.current.length);
    setMode("editing");

    drawPoly(pointsRef.current, "#f59e0b");
    createMarkers(pointsRef.current, true);
    fitToPoints(pointsRef.current);
  };

  const finishDrawing = () => {
    if (pointsRef.current.length >= 3) {
      cleanup();
      setMode("none");
      // Redraw as finalized
      drawPoly(pointsRef.current, "#2563eb");
      fitToPoints(pointsRef.current);
      onPolygonComplete([...pointsRef.current]);
    }
  };

  const finishEditing = () => {
    if (pointsRef.current.length >= 3) {
      cleanup();
      setMode("none");
      drawPoly(pointsRef.current, "#64748b");
      fitToPoints(pointsRef.current);
      onPolygonComplete([...pointsRef.current]);
    }
  };

  const cancelAll = () => {
    cleanup();
    setMode("none");
    if (existingPolygon && existingPolygon.length >= 3) {
      pointsRef.current = [...existingPolygon];
      setPointCount(existingPolygon.length);
      drawPoly(existingPolygon, "#64748b");
    } else {
      pointsRef.current = [];
      setPointCount(0);
      if (polyRef.current) { mapInstanceRef.current?.removeLayer(polyRef.current); polyRef.current = null; }
    }
  };

  const undoLast = () => {
    if (pointsRef.current.length > 0) {
      cleanup();
      pointsRef.current = pointsRef.current.slice(0, -1);
      setPointCount(pointsRef.current.length);
      if (pointsRef.current.length >= 2) {
        drawPoly(pointsRef.current, "#2563eb");
      }
      if (mode === "drawing") {
        createMarkers(pointsRef.current, false);
      }
    }
  };

  // Draw existing polygon on initial load
  useEffect(() => {
    if (mapReady && existingPolygon && existingPolygon.length >= 3 && mode === "none") {
      pointsRef.current = [...existingPolygon];
      setPointCount(existingPolygon.length);
      drawPoly(existingPolygon, "#64748b");
      fitToPoints(existingPolygon);
    }
  }, [mapReady, existingPolygon]);

  const hasPolygon = existingPolygon && existingPolygon.length >= 3;
  const isEditing = mode === "editing";
  const isDrawing = mode === "drawing";
  const isActive = isEditing || isDrawing;
  const pulseCSS = "@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}";

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px",
        background: isEditing ? "#fefce8" : isDrawing ? "#eff6ff" : "#f8fafc", borderRadius: 8,
        border: isEditing ? "1px solid #fde68a" : isDrawing ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
        flexWrap: "wrap",
      }}>
        {!isActive ? (
          <>
            {hasPolygon ? (
              <button onClick={startEditing} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar Polígono
              </button>
            ) : (
              <button onClick={startDrawing} className="btn btn-primary btn-sm">
                Dibujar Polígono
              </button>
            )}
            {hasPolygon && (
              <>
                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
                  {String.fromCharCode(10003)} {existingPolygon!.length} vértices
                </span>
                <button onClick={startDrawing} className="btn btn-ghost btn-sm" style={{ padding: "4px 12px", fontSize: 12 }}>
                  Redibujar
                </button>
              </>
            )}
            {referencePolygons.length > 0 && (
              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                {referencePolygons.length} sectores de referencia
              </span>
            )}
          </>
        ) : isEditing ? (
          <>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", background: "#fef9c3", color: "#a16207",
              borderRadius: 20, fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
              Editando — {pointCount} puntos
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>Arrastre puntos / Doble-click para eliminar</span>
            <button onClick={finishEditing} className="btn btn-success btn-sm" style={{ padding: "4px 12px", fontSize: 12, marginLeft: "auto" }}>Guardar</button>
            <button onClick={cancelAll} className="btn btn-ghost btn-sm" style={{ padding: "4px 12px", fontSize: 12, color: "#dc2626" }}>Cancelar</button>
          </>
        ) : (
          <>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", background: "#dbeafe", color: "#1d4ed8",
              borderRadius: 20, fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: "pulse 1.5s infinite" }} />
              Dibujando — {pointCount} puntos
            </span>
            {pointCount > 0 && <button onClick={undoLast} className="btn btn-ghost btn-sm" style={{ padding: "4px 12px", fontSize: 12 }}>Deshacer</button>}
            {pointCount >= 3 && <button onClick={finishDrawing} className="btn btn-success btn-sm" style={{ padding: "4px 12px", fontSize: 12 }}>Finalizar</button>}
            <button onClick={cancelAll} className="btn btn-ghost btn-sm" style={{ padding: "4px 12px", fontSize: 12, color: "#dc2626" }}>Cancelar</button>
          </>
        )}
      </div>

      <div ref={mapRef} style={{
        width: "100%", height, borderRadius: 10,
        border: isEditing ? "2px solid #f59e0b" : isDrawing ? "2px solid #3b82f6" : "1px solid #e2e8f0",
        cursor: isDrawing ? "crosshair" : "grab",
      }} />

      {isActive && (
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, textAlign: "center" }}>
          {isEditing ? "Arrastre los puntos azules para ajustar. Los sectores vecinos aparecen en gris." : "Click para agregar vértices."}
        </p>
      )}

      <style dangerouslySetInnerHTML={{ __html: pulseCSS }} />
    </div>
  );
}
