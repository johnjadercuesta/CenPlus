"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authHeaders } from "@/lib/api";

interface ResultadoPregunta {
  id: number;
  texto: string;
  tipo: "seleccion_unica" | "opcion_multiple" | "texto_libre" | "escala" | "si_no";
  obligatoria: boolean;
  total_respuestas: number;
  data: any;
}

interface ResultadosData {
  votacion_id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  tipo: string;
  total_participantes: number;
  resultados: ResultadoPregunta[];
}

export default function ResultadosVotacionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultadosData | null>(null);

  const fetchResultados = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/votaciones/${id}/resultados`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      } else {
        setError(json.error || "No se pudieron cargar los resultados");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResultados();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner border-t-blue-500 mb-3" style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p className="text-slate-500 font-medium">Procesando y calculando resultados en tiempo real...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-rose-600">Error al cargar resultados</h2>
        <p className="text-slate-500 mt-2">{error || "No se encontraron datos para esta encuesta."}</p>
        <div className="mt-6">
          <button onClick={() => router.push("/dashboard/votaciones")} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back button & Export */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.push("/dashboard/votaciones")} className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
          ← Volver a Votaciones
        </button>
        <div className="flex items-center gap-2">
          <button onClick={fetchResultados} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg text-sm transition-all">
            🔄 Actualizar
          </button>
          <a
            href={`/api/votaciones/${id}/exportar`}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm shadow transition-all inline-block"
          >
            📥 Exportar CSV
          </a>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                data.estado === "activa" ? "bg-emerald-50 text-emerald-700" :
                data.estado === "cerrada" ? "bg-rose-50 text-rose-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                {data.estado}
              </span>
              <span className="text-xs text-slate-400 font-medium capitalize">• Módulo: {data.tipo}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{data.titulo}</h1>
            <p className="text-slate-500 text-sm max-w-3xl">{data.descripcion || "Sin descripción proporcionada."}</p>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center min-w-[140px]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Participantes</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{data.total_participantes}</p>
            <p className="text-[10px] text-slate-400 mt-1">votos registrados</p>
          </div>
        </div>
      </div>

      {/* Results details */}
      {data.resultados.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 shadow-sm">
          Esta encuesta no contiene preguntas.
        </div>
      ) : (
        <div className="space-y-8">
          {data.resultados.map((preg, idx) => {
            const hasAnswers = preg.total_respuestas > 0;

            return (
              <div key={preg.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
                {/* Question Info */}
                <div className="flex justify-between items-start gap-4 border-b border-slate-50 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{preg.tipo.replace("_", " ")}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{preg.texto}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block">Respuestas</span>
                    <span className="text-sm font-extrabold text-slate-700">{preg.total_respuestas}</span>
                  </div>
                </div>

                {/* Aggregated view */}
                {!hasAnswers ? (
                  <div className="text-center py-6 text-slate-400 text-sm italic">
                    Aún no hay respuestas registradas para esta pregunta.
                  </div>
                ) : (
                  <div>
                    {/* SELECCION UNICA / SI NO */}
                    {(preg.tipo === "seleccion_unica" || preg.tipo === "si_no") && (
                      <div className="space-y-4">
                        {Object.entries(preg.data).map(([option, count]: [string, any]) => {
                          const percentage = preg.total_respuestas > 0 ? ((count / preg.total_respuestas) * 100).toFixed(1) : "0";
                          return (
                            <div key={option} className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold text-slate-700">{option}</span>
                                <span className="font-bold text-slate-900">{count} ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* OPCION MULTIPLE */}
                    {preg.tipo === "opcion_multiple" && (
                      <div className="space-y-4">
                        {Object.entries(preg.data).map(([option, count]: [string, any]) => {
                          // Note: multiple choice percentage can exceed 100% aggregate, so we show percentage of total responses
                          const percentage = data.total_participantes > 0 ? ((count / data.total_participantes) * 100).toFixed(1) : "0";
                          return (
                            <div key={option} className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold text-slate-700">{option}</span>
                                <span className="font-bold text-slate-900">{count} ({percentage}% de encuestados)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-violet-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ESCALA (1 - 10) */}
                    {preg.tipo === "escala" && (
                      <div className="flex flex-col md:flex-row items-center gap-8 py-4">
                        {/* Circle Score Card */}
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl w-full md:w-1/3 text-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promedio Escala</span>
                          <span className="text-5xl font-black text-blue-600 mt-2">{preg.data.promedio}</span>
                          <span className="text-xs text-slate-400 mt-1">de 10 puntos</span>
                        </div>

                        {/* Distribution chart list */}
                        <div className="flex-1 w-full space-y-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Distribución de Puntuaciones</span>
                          {Object.entries(preg.data.distribucion || {}).map(([score, count]: [string, any]) => {
                            const totalConEscala = preg.data.total || 1;
                            const pct = ((count / totalConEscala) * 100).toFixed(1);
                            return (
                              <div key={score} className="flex items-center gap-3 text-xs">
                                <span className="w-4 text-right font-bold text-slate-500">{score}</span>
                                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-12 text-slate-500 text-right">{count} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TEXTO LIBRE */}
                    {preg.tipo === "texto_libre" && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Últimos comentarios</span>
                        <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                          {(preg.data.respuestas || []).map((resp: string, rIdx: number) => (
                            <div key={rIdx} className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700 shadow-xs">
                              {resp}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
