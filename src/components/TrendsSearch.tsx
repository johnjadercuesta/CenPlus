"use client";

import { useState } from "react";

const LOCATIONS = [
  { name: "Bogotá, Cundinamarca", lat: 4.711, lng: -74.0721 },
  { name: "Medellín, Antioquia", lat: 6.2476, lng: -75.5658 },
  { name: "Cali, Valle del Cauca", lat: 3.4516, lng: -76.532 },
  { name: "Barranquilla, Atlántico", lat: 10.9685, lng: -74.7813 },
  { name: "Cartagena, Bolívar", lat: 10.391, lng: -75.5144 },
  { name: "Bucaramanga, Santander", lat: 7.1254, lng: -73.1198 },
  { name: "Pereira, Risaralda", lat: 4.8133, lng: -75.6961 },
  { name: "Manizales, Caldas", lat: 5.0689, lng: -75.5174 },
  { name: "Cúcuta, Norte de Santander", lat: 7.8939, lng: -72.5078 },
  { name: "Santa Marta, Magdalena", lat: 11.2408, lng: -74.199 },
  { name: "Ibagué, Tolima", lat: 4.4389, lng: -75.2322 },
  { name: "Villavicencio, Meta", lat: 4.142, lng: -73.6266 },
  { name: "Pasto, Nariño", lat: 1.2136, lng: -77.2856 },
  { name: "Neiva, Huila", lat: 2.9273, lng: -75.2819 },
  { name: "Armenia, Quindío", lat: 4.5339, lng: -75.6811 },
  { name: "Montería, Córdoba", lat: 8.7479, lng: -75.8814 },
  { name: "Popayán, Cauca", lat: 2.4419, lng: -76.6064 },
  { name: "Tunja, Boyacá", lat: 5.5353, lng: -73.3678 },
  { name: "Valledupar, Cesar", lat: 10.4631, lng: -73.2532 },
  { name: "Sincelejo, Sucre", lat: 9.3047, lng: -75.3978 },
];

export default function TrendsSearch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");

  const filtered = query.length > 0
    ? LOCATIONS.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div style={{ marginBottom: 10, position: "relative" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar ciudad..."
        style={{
          width: "100%",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: "7px 10px",
          color: "#f8fafc",
          fontSize: 11,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 6,
            zIndex: 1000,
            maxHeight: 200,
            overflowY: "auto",
            marginTop: 2,
          }}
        >
          {filtered.map((l, i) => (
            <div
              key={i}
              onClick={() => {
                onPick(l.lat, l.lng);
                setQuery("");
              }}
              style={{
                padding: "6px 10px",
                fontSize: 10,
                color: "#cbd5e1",
                cursor: "pointer",
                borderBottom: "1px solid #334155",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {l.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
