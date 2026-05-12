'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Importaciones dinámicas para Leaflet
const MapaInteligencia = dynamic(() => import('./MapaInteligencia'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500">
      Cargando Mapa...
    </div>
  )
});

const GraficoTendencias = dynamic(() => import('./GraficoTendencias'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-slate-900 animate-pulse rounded-xl" />
  )
});

const API_BASE_URL = process.env.NEXT_PUBLIC_TRENDS_API_URL || 'http://localhost:8000/api/v1';

interface ApiConfig {
  twitter_bearer_token?: string;
  youtube_api_key?: string;
  openai_api_key?: string;
  custom_search_key?: string;
  custom_search_id?: string;
}

const defaultApiConfig: ApiConfig = {
  twitter_bearer_token: '',
  youtube_api_key: '',
  openai_api_key: '',
  custom_search_key: '',
  custom_search_id: ''
};

interface Trend {
  keyword: string;
  platform: string;
  frequency_score: number;
  sentiment: number;
  growth_rate: number;
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  timestamp: string;
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

const PLATAFORMAS = [
  { id: '', label: 'Global' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'google', label: 'Google Web' },
  { id: 'google_news', label: 'G. News' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
];

const TIEMPO = [
  { id: '1h', label: '1 hora' },
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 días' },
];

export default function InteligenciaTerritorial() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [mapData, setMapData] = useState<MapFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [platform, setPlatform] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [query, setQuery] = useState('');
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'trends' | 'map' | 'compare'>('trends');
  const [lastUpdate, setLastUpdate] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inteligencia_api_config');
      return saved ? JSON.parse(saved) : defaultApiConfig;
    }
    return defaultApiConfig;
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const trendsRes = await axios.get(`${API_BASE_URL}/trends`, {
        params: {
          platform: platform || undefined,
          limit: 15,
          time_range: timeRange
        }
      });
      setTrends(trendsRes.data.data || []);

      const mapRes = await axios.get(`${API_BASE_URL}/trends/map`, {
        params: { limit: 50 }
      });
      setMapData(mapRes.data.features || []);

      setLastUpdate(new Date().toLocaleTimeString('es-CO'));
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [platform, timeRange]);

  const runScraping = async () => {
    setScraping(true);
    try {
      const queryToUse = query || 'Colombia';
      await axios.post(`${API_BASE_URL}/scrape/run`, {
        platforms: platform ? [platform] : ['twitter', 'youtube', 'google', 'google_news', 'instagram', 'facebook'],
        query: queryToUse,
        max_results: 10
      });
      await fetchData();
    } catch (err) {
      console.error('Error running scraping:', err);
    } finally {
      setScraping(false);
    }
  };

  const compareTrends = async () => {
    if (compareKeywords.length < 2) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/trends/compare`, {
        params: { keywords: compareKeywords.join(',') }
      });
      setTrends(res.data.data || []);
    } catch (err) {
      console.error('Error comparing trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveApiConfig = async () => {
    setSavingConfig(true);
    try {
      localStorage.setItem('inteligencia_api_config', JSON.stringify(apiConfig));
      await axios.post(`${API_BASE_URL}/scrape/config`, apiConfig);
      setShowApiConfig(false);
    } catch (err) {
      localStorage.setItem('inteligencia_api_config', JSON.stringify(apiConfig));
    } finally {
      setSavingConfig(false);
    }
  };

  const updateApiConfig = (key: keyof ApiConfig, value: string) => {
    setApiConfig({ ...apiConfig, [key]: value });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${scraping ? 'bg-yellow-500 animate-pulse' : loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {scraping ? 'Scraping...' : loading ? 'Cargando' : 'En Vivo'}
              </span>
            </div>
            {lastUpdate && <span className="text-[10px] text-slate-500 ml-2">Actualizado: {lastUpdate}</span>}
          </div>

          <div className="flex gap-2">
            {(['trends', 'map', 'compare'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {mode === 'trends' ? 'Tendencias' : mode === 'map' ? 'Mapa' : 'Comparar'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowApiConfig(!showApiConfig)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-400 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            APIs
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 items-center">
          <div className="flex flex-wrap gap-2">
            {PLATAFORMAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  platform === p.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-slate-700" />

          <div className="flex gap-2">
            {TIEMPO.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  timeRange === t.id ? 'bg-slate-700 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-slate-700" />

          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tema..."
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
            />
            <button
              onClick={runScraping}
              disabled={scraping}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 rounded-lg text-xs font-bold text-white transition-all"
            >
              {scraping ? 'Ejecutando...' : 'Scraping'}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-slate-900/60 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-tighter flex items-center gap-2">
              <span className="text-blue-500">#</span> Tendencias Activas
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {trends.map((t, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-800/30 hover:bg-slate-800/70 rounded-lg border border-slate-800/50 transition-all cursor-pointer"
                    onClick={() => {
                      const newKeywords = [...compareKeywords];
                      if (!newKeywords.includes(t.keyword)) {
                        newKeywords.push(t.keyword);
                        setCompareKeywords(newKeywords);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 font-bold text-sm truncate">{t.keyword}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{t.platform}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          {t.location?.city || 'Colombia'}
                          <span className={t.sentiment > 0.1 ? 'text-green-500' : t.sentiment < -0.1 ? 'text-red-500' : 'text-slate-400'}>
                            {t.sentiment > 0 ? '↑' : t.sentiment < 0 ? '↓' : '→'} {Math.abs(t.sentiment * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 text-xs font-bold">+{t.growth_rate}%</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.frequency_score} pts</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">Mapa Geográfico</h4>
              <MapaInteligencia trends={trends} features={mapData} />
            </div>
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">Análisis de Tendencias</h4>
              <GraficoTendencias data={trends} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'map' && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
          <h3 className="text-sm font-black text-white mb-4">Mapa de Inteligencia Territorial</h3>
          <MapaInteligencia trends={trends} features={mapData} />
        </div>
      )}

      {viewMode === 'compare' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs text-slate-400">Comparar:</span>
              {compareKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-1 bg-blue-600/30 border border-blue-500/50 rounded-full text-xs text-blue-400">
                  {kw}
                  <button onClick={() => setCompareKeywords(compareKeywords.filter((_, idx) => idx !== i))} className="ml-1 text-blue-300 hover:text-white">×</button>
                </span>
              ))}
              {compareKeywords.length > 1 && (
                <button onClick={compareTrends} disabled={loading} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white">
                  Comparar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compareKeywords.map((kw, i) => {
              const trend = trends.find(t => t.keyword === kw);
              return (
                <div key={i} className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
                  <h4 className="text-lg font-bold text-white mb-2">{kw}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Frecuencia</span>
                      <span className="text-xs text-white">{trend?.frequency_score || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Crecimiento</span>
                      <span className="text-xs text-green-400">+{trend?.growth_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Sentimiento</span>
                      <span className={`text-xs ${(trend?.sentiment ?? 0) > 0 ? 'text-green-500' : (trend?.sentiment ?? 0) < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {(trend?.sentiment ?? 0) > 0 ? 'Positivo' : (trend?.sentiment ?? 0) < 0 ? 'Negativo' : 'Neutral'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Plataforma</span>
                      <span className="text-xs text-white">{trend?.platform || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* API Config Modal */}
      {showApiConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Configuración de APIs</h3>
              <button onClick={() => setShowApiConfig(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              Ingresa las claves de API para obtener datos reales. Las que dejes en blanco usarán scraping gratuito.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Twitter/X Bearer Token</label>
                <input
                  type="password"
                  value={apiConfig.twitter_bearer_token || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, twitter_bearer_token: e.target.value })}
                  placeholder="Ingresa tu Twitter Bearer Token"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">YouTube Data API Key</label>
                <input
                  type="password"
                  value={apiConfig.youtube_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, youtube_api_key: e.target.value })}
                  placeholder="Ingresa tu YouTube API Key"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={apiConfig.openai_api_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, openai_api_key: e.target.value })}
                  placeholder="Ingresa tu OpenAI API Key"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Google Custom Search API Key</label>
                <input
                  type="password"
                  value={apiConfig.custom_search_key || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, custom_search_key: e.target.value })}
                  placeholder="Ingresa tu Google API Key"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Google Custom Search Engine ID</label>
                <input
                  type="password"
                  value={apiConfig.custom_search_id || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, custom_search_id: e.target.value })}
                  placeholder="Ingresa tu Search Engine ID"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApiConfig(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
              >
                Cancelar
              </button>
              <button
                onClick={saveApiConfig}
                disabled={savingConfig}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm text-white font-semibold"
              >
                {savingConfig ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-[10px] text-slate-400">
                <strong>Nota:</strong> Las APIs son opcionales. Sin ellas, el sistema usará scraping básico.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}