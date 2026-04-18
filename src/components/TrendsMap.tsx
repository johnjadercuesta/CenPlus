'use client';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';

interface TrendsMapProps {
  trends: any[];
  center?: [number, number];
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

export default function TrendsMap({ trends, center = [6.2442, -75.5812] }: TrendsMapProps) {
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ChangeView center={center} />
        {trends.map((t, idx) => (
          <CircleMarker
            key={idx}
            center={[t.location.lat, t.location.lng]}
            radius={Math.min(t.frequency_score / 10 + 5, 25)}
            pathOptions={{
              fillColor: t.sentiment > 0.1 ? '#10b981' : t.sentiment < -0.1 ? '#ef4444' : '#3b82f6',
              color: '#fff',
              weight: 1,
              fillOpacity: 0.6,
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 text-slate-900">
                <strong className="text-lg">{t.keyword}</strong>
                <p className="text-sm">Frecuencia: {t.frequency_score}</p>
                <p className="text-sm">Sentimiento: {t.sentiment > 0 ? "Positivo" : t.sentiment < 0 ? "Negativo" : "Neutral"}</p>
                <p className="text-xs text-slate-500 uppercase">{t.platform}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
