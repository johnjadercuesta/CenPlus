'use client';
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Trend {
  keyword: string;
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  frequency_score: number;
  sentiment: number;
  growth_rate: number;
}

interface MapFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    keyword: string;
    intensity: number;
    sentiment: number;
    city: string;
  };
}

interface MapaInteligenciaProps {
  trends: Trend[];
  features?: MapFeature[];
}

export default function MapaInteligencia({ trends = [], features = [] }: MapaInteligenciaProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inicializar mapa
    const map = L.map(mapRef.current, {
      center: [6.2476, -75.5658],
      zoom: 6,
      zoomControl: true,
      minZoom: 4,
      maxZoom: 12
    });

    // Capa de.OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    // Añadir controles
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpiar marcadores anteriores
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Añadir marcadores de tendencias
    trends.forEach((trend) => {
      const lat = trend.location?.lat || 6.2476;
      const lng = trend.location?.lng || -75.5658;
      const city = trend.location?.city || 'Colombia';
      
      // Color según sentimiento
      const sentimentColor = trend.sentiment > 0.1 ? '#22c55e' : trend.sentiment < -0.1 ? '#ef4444' : '#64748b';
      const intensity = Math.min(trend.frequency_score / 100, 1);
      
      // Crear marcador personalizado
      const marker = L.circleMarker([lat, lng], {
        radius: 5 + (intensity * 15),
        fillColor: sentimentColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      });

      marker.bindPopup(`
        <div style="min-width: 150px">
          <strong style="color: #1e293b">${trend.keyword}</strong><br/>
          <span style="color: #64748b">${city}</span><br/>
          <span>Frecuencia: ${trend.frequency_score}</span><br/>
          <span>Crecimiento: +${trend.growth_rate}%</span><br/>
          <span>Sentimiento: ${trend.sentiment > 0 ? 'Positivo' : trend.sentiment < 0 ? 'Negativo' : 'Neutral'}</span>
        </div>
      `);

      marker.addTo(map);
    });

    // Añadir features del mapa
    features.forEach((feature) => {
      if (feature.geometry?.type === 'Point' && feature.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties || {};
        
        const marker = L.circleMarker([lat, lng], {
          radius: 3 + (props.intensity / 200),
          fillColor: props.sentiment > 0 ? '#22c55e' : props.sentiment < -0.1 ? '#ef4444' : '#64748b',
          color: '#ffffff',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        });

        marker.bindPopup(`
          <div style="min-width: 120px">
            <strong>${props.keyword}</strong><br/>
            <span>Intensidad: ${props.intensity}</span><br/>
            <span>Ciudad: ${props.city}</span>
          </div>
        `);

        marker.addTo(map);
      }
    });

    // Ajustar vista si hay datos
    if (trends.length > 0) {
      const validCoords = trends
        .filter(t => t.location?.lat && t.location?.lng)
        .map(t => [t.location.lat, t.location.lng] as [number, number]);
      
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [trends, features]);

  return (
    <div ref={mapRef} className="h-[400px] w-full rounded-lg" />
  );
}