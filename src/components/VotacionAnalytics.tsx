"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authHeaders } from "@/lib/api";
import VotacionGrafico from "./VotacionGrafico";

const DIMENSION_LABELS: Record<string, string> = {
  sexo: "Sexo",
  edad_rango: "Edad",
  zona: "Zona",
  comuna: "Comuna / Corregimiento",
  barrio: "Barrio / Vereda",
  nivel_estudios: "Nivel de Estudios",
  regimen_salud: "Régimen de Salud",
  es_lider: "Líder",
  ocupacion: "Ocupación",
};

const TIPOS_GRAFICO = [
  { value: "bar", label: "Barras" },
  { value: "pie", label: "Pastel" },
  { value: "doughnut", label: "Dona" },
];

interface ResultadoPregunta {
  id: number;
  texto: string;
  tipo: "seleccion_unica" | "opcion_multiple" | "texto_libre" | "escala" | "si_no";
  obligatoria: boolean;
  total_respuestas: number;
  data: any;
  grupos?: Record<string, any>;
}

interface ResultadosData {
  votacion_id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  tipo: string;
  total_participantes: number;
  dimensiones: string[];
  resultados: ResultadoPregunta[];
  breakdown_by: string | null;
}

interface Props {
  id: string;
}

export default function VotacionAnalytics({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultadosData | null>(null);

  const [dimension, setDimension] = useState("ninguno");
  const [chartTypes, setChartTypes] = useState<Record<number, string>>({});

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (dimension !== "ninguno") params.set("breakdown_by", dimension);
    return params.toString();
  }, [dimension]);

  const fetchResultados = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const qs = buildQuery();
      const url = `/api/votaciones/${id}/resultados${qs ? '?' + qs : ''}`;
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json.data);
      else setError(json.error || "Error al cargar resultados");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [id, buildQuery]);

  useEffect(() => {
    fetchResultados();
  }, [fetchResultados]);

  const getExportUrl = () => {
    const qs = buildQuery();
    return `/api/votaciones/${id}/exportar${qs ? '?' + qs : ''}`;
  };

  const setChartType = (preguntaId: number, type: string) => {
    setChartTypes(prev => ({ ...prev, [preguntaId]: type }));
  };

  const availableDimensions = (data?.dimensiones || []).filter((d: string) => DIMENSION_LABELS[d]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-3" style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <p className="text-slate-500 font-medium">Procesando y calculando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-rose-600">Error al cargar resultados</h2>
        <p className="text-slate-500 mt-2">{error || "No se encontraron datos."}</p>
        <div className="mt-6">
          <button onClick={() => router.push("/dashboard/votaciones")} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/dashboard/votaciones")} className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
                ← Volver
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                data.estado === "activa" ? "bg-emerald-50 text-emerald-700" :
                data.estado === "cerrada" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"
              }`}>
                {data.estado}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{data.titulo}</h1>
            <p className="text-slate-500 text-sm max-w-3xl">{data.descripcion || "Sin descripción."}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center min-w-[140px]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Participantes</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{data.total_participantes}</p>
          </div>
        </div>
      </div>

      {/* Simple toolbar: dimension + actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          {availableDimensions.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Desglosar por:</label>
              <select value={dimension} onChange={e => setDimension(e.target.value)} className="input text-sm" style={{ width: "auto", minWidth: 160, padding: "6px 10px" }}>
                <option value="ninguno">General (sin desglose)</option>
                {availableDimensions.map(d => (
                  <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={fetchResultados} className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg text-xs transition-all">
              🔄 Actualizar
            </button>
            <a href={getExportUrl()} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow transition-all">
              📥 CSV
            </a>
          </div>
        </div>
      </div>

      {/* Results */}
      {data.resultados.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 shadow-sm">
          Esta encuesta no contiene preguntas.
        </div>
      ) : (
        <div className="space-y-6">
          {data.resultados.map((preg, idx) => {
            const ct = chartTypes[preg.id] || "bar";
            const hasAnswers = preg.total_respuestas > 0;
            return (
              <div key={preg.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-start gap-4 border-b border-slate-50 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{preg.tipo.replace("_", " ")}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{preg.texto}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-slate-400 block">Respuestas</span>
                    <span className="text-sm font-extrabold text-slate-700">{preg.total_respuestas}</span>
                  </div>
                </div>

                {!hasAnswers ? (
                  <div className="text-center py-6 text-slate-400 text-sm italic">
                    Aún no hay respuestas registradas para esta pregunta.
                  </div>
                ) : (
                  <div>
                    {/* Per-question chart type toggle */}
                    {preg.tipo !== "texto_libre" && (
                      <div className="flex items-center gap-1 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Gráfico:</span>
                        {TIPOS_GRAFICO.map(t => (
                          <button
                            key={t.value}
                            onClick={() => setChartType(preg.id, t.value)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-all ${
                              ct === t.value
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {preg.tipo === "texto_libre" ? (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Últimos comentarios</span>
                        <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                          {(preg.data.respuestas || []).map((resp: string, rIdx: number) => (
                            <div key={rIdx} className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700 shadow-xs">{resp}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <VotacionGrafico
                        tipo={preg.tipo}
                        data={preg.data}
                        total={preg.total_respuestas}
                        chartType={ct as "bar" | "pie" | "doughnut"}
                        grupos={preg.grupos}
                        dimensionLabel={dimension !== "ninguno" ? DIMENSION_LABELS[dimension] : undefined}
                      />
                    )}
                  </div>
                )}

                {/* Summary table for non-text questions */}
                {hasAnswers && preg.tipo !== "texto_libre" && preg.tipo !== "escala" && !preg.grupos && (
                  <div className="border-t border-slate-100 pt-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 font-bold uppercase">
                          <th className="text-left pb-1">Opción</th>
                          <th className="text-right pb-1">Votos</th>
                          <th className="text-right pb-1">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(preg.data).filter(([, v]: any) => typeof v === "number").map(([opt, count]: [string, any]) => {
                          const total = preg.total_respuestas;
                          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                          return (
                            <tr key={opt} className="border-t border-slate-50">
                              <td className="py-1.5 text-slate-700 font-medium">{opt}</td>
                              <td className="py-1.5 text-right text-slate-900 font-bold">{count}</td>
                              <td className="py-1.5 text-right text-slate-500">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
