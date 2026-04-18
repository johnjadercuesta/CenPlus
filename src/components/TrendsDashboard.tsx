'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Importación dinámica para evitar errores de SSR con Leaflet
const TrendsMap = dynamic(() => import('./TrendsMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Cargando Mapa Satelital...</div>
});

const TrendsChart = dynamic(() => import('./TrendsChart'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-slate-900 animate-pulse rounded-xl" />
});

const API_BASE_URL = process.env.NEXT_PUBLIC_TRENDS_API_URL || 'http://localhost:8000/api/v1';

const MOCK_TRENDS = [
  { keyword: "agua potable", location: { city: "Medellín" }, sentiment: 0.8, growth_rate: 45, frequency_score: 1250 },
  { keyword: "vía terciaria", location: { city: "Bogotá" }, sentiment: -0.6, growth_rate: 32, frequency_score: 980 },
  { keyword: "salud rural", location: { city: "Cali" }, sentiment: 0.3, growth_rate: 28, frequency_score: 850 },
  { keyword: "educación", location: { city: "Barranquilla" }, sentiment: 0.5, growth_rate: 22, frequency_score: 720 },
  { keyword: "seguridad", location: { city: "Cúcuta" }, sentiment: -0.4, growth_rate: 18, frequency_score: 650 },
  { keyword: "empleo", location: { city: "Cartagena" }, sentiment: 0.1, growth_rate: 15, frequency_score: 580 },
  { keyword: "transporte público", location: { city: "Bucaramanga" }, sentiment: -0.2, growth_rate: 12, frequency_score: 420 },
  { keyword: "energía", location: { city: "Pereira" }, sentiment: 0.6, growth_rate: 10, frequency_score: 380 },
];

export default function TrendsDashboard() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/trends`, {
        params: { 
          platform: platform || undefined, 
          limit: 10,
          time_range: timeRange
        }
      });
      setTrends(data.data);
    } catch (err) {
      console.log("Usando datos locales (servidor no disponible)");
      setTrends(MOCK_TRENDS.filter(t => {
        if (!platform) return true;
        return true;
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [platform, timeRange]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado: Live Feed</span>
        </div>
        <div className="flex gap-6">
          <div className="flex gap-3">
            {['', 'twitter', 'youtube', 'google', 'google_news', 'instagram', 'facebook'].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                  platform === p 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {p === '' ? 'Global' : p === 'google' ? 'Google Web' : p === 'google_news' ? 'G. News' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-6 w-[1px] bg-slate-800 mx-2" />
          <div className="flex gap-3">
            {[
              { label: '1h', val: '1h' },
              { label: '24h', val: '24h' },
              { label: '7d', val: '7d' }
            ].map((t) => (
              <button
                key={t.val}
                onClick={() => setTimeRange(t.val)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  timeRange === t.val 
                  ? 'bg-slate-700 border-blue-500 text-blue-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Tendencias */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 shadow-xl">
             <h3 className="text-sm font-black text-white mb-4 uppercase tracking-tighter flex items-center gap-2">
                <span className="text-blue-500">#</span> Top Trending Now
             </h3>
             {loading ? (
                <div className="space-y-3">
                   {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-lg" />)}
                </div>
             ) : (
                <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                   {trends.map((t, i) => (
                      <div key={i} className="group p-4 bg-slate-800/30 hover:bg-slate-800/80 rounded-xl border border-slate-800/50 transition-all cursor-pointer">
                         <div className="flex justify-between items-start">
                            <div>
                               <span className="text-blue-400 font-bold block group-hover:text-blue-300 transition-colors uppercase text-sm">{t.keyword}</span>
                               <span className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                                  {t.location.city} • <span className={t.sentiment > 0.1 ? 'text-green-500' : t.sentiment < -0.1 ? 'text-red-500' : 'text-slate-400'}>
                                     Sent: {t.sentiment > 0 ? "Positivo" : t.sentiment < 0 ? "Negativo" : "Neutral"}
                                  </span>
                               </span>
                            </div>
                            <div className="text-right">
                               <div className="text-green-400 text-xs font-bold">+{t.growth_rate}%</div>
                               <div className="text-[10px] text-slate-600 font-mono">{t.frequency_score} pts</div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Mapa y Gráfico */}
        <div className="lg:col-span-2 space-y-6">
          <TrendsMap trends={trends} />
          <TrendsChart data={trends} />
        </div>
      </div>
    </div>
  );
}
