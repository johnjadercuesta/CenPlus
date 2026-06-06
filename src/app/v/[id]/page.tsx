"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface Pregunta {
  id: number;
  orden: number;
  texto: string;
  tipo: "seleccion_unica" | "opcion_multiple" | "texto_libre" | "escala" | "si_no";
  opciones: string[] | null;
  obligatoria: boolean;
}

interface Votacion {
  id: number;
  titulo: string;
  descripcion: string;
  estado: "borrador" | "activa" | "cerrada";
  tipo: "encuesta" | "votacion" | "investigacion";
  audiencia: "app_users" | "ciudadanos" | "publico";
  visibilidad_resultados: "app_users" | "ciudadanos" | "publico";
  limite_respuestas: "una_por_sesion" | "una_por_ciudadano" | "multiples";
  fecha_inicio: string | null;
  fecha_fin: string | null;
  preguntas: Pregunta[];
}

export default function PublicSurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id;
  const tenantParam = searchParams.get("tenant") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [votacion, setVotacion] = useState<Votacion | null>(null);
  const [branding, setBranding] = useState<{ primary_color: string; secondary_color: string; logo_url: string | null }>({
    primary_color: "#1e3a8a",
    secondary_color: "#3b82f6",
    logo_url: null,
  });

  // User input states
  const [identificacion, setIdentificacion] = useState("");
  const [respuestas, setRespuestas] = useState<{ [key: number]: any }>({});
  const [showResults, setShowResults] = useState(false);
  const [resultados, setResultados] = useState<any>(null);

  // Generate or retrieve session ID
  const getSessionId = () => {
    if (typeof window !== "undefined") {
      let sid = localStorage.getItem("cenplus_session_id");
      if (!sid) {
        sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("cenplus_session_id", sid);
      }
      return sid;
    }
    return "";
  };

  useEffect(() => {
    if (!id) return;

    const fetchSurveyAndBranding = async () => {
      try {
        setLoading(true);
        const querySuffix = tenantParam ? `?tenant=${tenantParam}` : "";

        // 1. Fetch Branding
        try {
          const brandRes = await fetch(`/api/tenant/config${querySuffix}`);
          if (brandRes.ok) {
            const bData = await brandRes.json();
            setBranding({
              primary_color: bData.primary_color || "#1e3a8a",
              secondary_color: bData.secondary_color || "#3b82f6",
              logo_url: bData.logo_url || null,
            });
          }
        } catch {}

        // 2. Fetch Survey Details
        const res = await fetch(`/api/votaciones/${id}${querySuffix}`);
        const data = await res.json();
        if (res.ok) {
          setVotacion(data.data);
          
          // Check if already answered in local storage
          const answeredKey = `answered_${id}`;
          if (localStorage.getItem(answeredKey)) {
            // If answered, check if we can show results
            if (data.data.visibilidad_resultados === "publico") {
              fetchResultados();
            } else {
              setSuccess(true);
            }
          }
        } else {
          setError(data.error || "No se pudo cargar la encuesta");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyAndBranding();
  }, [id, tenantParam]);

  const fetchResultados = async () => {
    const querySuffix = tenantParam ? `?tenant=${tenantParam}` : "";
    try {
      const res = await fetch(`/api/votaciones/${id}/resultados${querySuffix}`);
      const data = await res.json();
      if (res.ok) {
        setResultados(data.data);
        setShowResults(true);
      }
    } catch {}
  };

  const handleResponseChange = (preguntaId: number, field: string, value: any) => {
    setRespuestas((prev) => {
      const current = prev[preguntaId] || {};
      if (field === "opcion_multiple") {
        const currentOpts = current.opciones || [];
        const exists = currentOpts.includes(value);
        const nextOpts = exists
          ? currentOpts.filter((o: any) => o !== value)
          : [...currentOpts, value];
        return {
          ...prev,
          [preguntaId]: { opciones: nextOpts }
        };
      }
      return {
        ...prev,
        [preguntaId]: { ...current, [field]: value }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!votacion) return;

    setError(null);

    // Validate citizen identification if required
    if (votacion.audiencia === "ciudadanos" || votacion.limite_respuestas === "una_por_ciudadano") {
      if (!identificacion.trim()) {
        setError("Por favor, ingrese su número de cédula o documento de identidad");
        return;
      }
    }

    // Validate obligatoriedad
    for (const preg of votacion.preguntas) {
      const ans = respuestas[preg.id];
      const hasValue = ans && (
        (typeof ans.texto === "string" && ans.texto.trim().length > 0) ||
        (Array.isArray(ans.opciones) && ans.opciones.length > 0) ||
        (ans.escala !== undefined && ans.escala !== null)
      );

      if (preg.obligatoria && !hasValue) {
        setError(`La pregunta "${preg.texto}" es obligatoria`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const querySuffix = tenantParam ? `?tenant=${tenantParam}` : "";
      
      const payload = {
        sesion_id: getSessionId(),
        identificacion: identificacion.trim() || null,
        respuestas,
      };

      const res = await fetch(`/api/votaciones/${id}/responder${querySuffix}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        // Mark as answered
        localStorage.setItem(`answered_${id}`, "true");
        setSuccess(true);

        // Fetch results if publicly visible
        if (votacion.visibilidad_resultados === "publico") {
          await fetchResultados();
        }
      } else {
        setError(data.error || "Ocurrió un error al enviar tu respuesta");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="text-center p-6">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error && !votacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800">No se pudo cargar la encuesta</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (success && !showResults) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
          <h2 className="text-2xl font-bold text-slate-900">¡Muchas gracias!</h2>
          <p className="text-slate-600">
            Tu respuesta ha sido registrada de forma segura. Valoramos tu tiempo y tu valiosa opinión.
          </p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            CenPlus • Control de Opinión e Investigación Territorial
          </div>
        </div>
      </div>
    );
  }

  if (showResults && resultados) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto">✓</div>
            <h2 className="text-xl font-bold text-slate-800">¡Respuesta Registrada!</h2>
            <p className="text-sm text-slate-500">A continuación se muestran los resultados consolidados de la opinión pública en tiempo real.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-950">{resultados.titulo}</h1>
            <p className="text-slate-500 text-sm">{resultados.descripcion}</p>
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded">
              Participantes Totales: {resultados.total_participantes}
            </div>
          </div>

          <div className="space-y-6">
            {resultados.resultados.map((preg: any, idx: number) => {
              const hasVal = preg.total_respuestas > 0;
              return (
                <div key={preg.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <h3 className="text-base font-bold text-slate-800">{preg.texto}</h3>
                  </div>

                  {!hasVal ? (
                    <p className="text-xs italic text-slate-400">Sin respuestas.</p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {(preg.tipo === "seleccion_unica" || preg.tipo === "si_no" || preg.tipo === "opcion_multiple") && (
                        Object.entries(preg.data).map(([option, count]: [string, any]) => {
                          const pct = preg.total_respuestas > 0 ? ((count / preg.total_respuestas) * 100).toFixed(1) : "0";
                          return (
                            <div key={option} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-700">{option}</span>
                                <span className="text-slate-900 font-bold">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}

                      {preg.tipo === "escala" && (
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                          <div>
                            <span className="text-xs text-slate-400 block font-bold uppercase">Promedio</span>
                            <span className="text-3xl font-black text-blue-600">{preg.data.promedio}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            de una escala de 1 a 10 puntos (basado en {preg.data.total} calificaciones).
                          </div>
                        </div>
                      )}

                      {preg.tipo === "texto_libre" && (
                        <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 italic">
                          Las respuestas escritas son resguardadas de forma confidencial.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const isCitizenRequired = votacion?.audiencia === "ciudadanos" || votacion?.limite_respuestas === "una_por_ciudadano";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Logo and Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-10 object-contain rounded" />
            ) : (
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-lg">C+</div>
            )}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estudios de Opinión</span>
              <strong className="text-slate-800 text-sm">CenPlus Territorio</strong>
            </div>
          </div>
        </div>

        {/* Survey Main Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-4">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{votacion?.titulo}</h1>
          {votacion?.descripcion && (
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{votacion.descripcion}</p>
          )}
          
          {votacion?.fecha_fin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-semibold">
              <span>⏰ Disponible hasta:</span>
              <strong>{new Date(votacion.fecha_fin).toLocaleString()}</strong>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity validation step */}
          {isCitizenRequired && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                Número de Cédula o Documento de Identidad *
              </label>
              <input
                type="text"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                placeholder="Ej. 1040855221"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-semibold"
              />
              <p className="text-xs text-slate-400">
                Este dato es utilizado únicamente para validar su participación registrada en la base de datos y evitar duplicados.
              </p>
            </div>
          )}

          {/* Render Questions */}
          {votacion?.preguntas.map((preg, idx) => {
            const val = respuestas[preg.id] || {};

            return (
              <div key={preg.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-4">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">
                    {preg.texto} {preg.obligatoria && <span className="text-rose-500">*</span>}
                  </h3>
                </div>

                {/* Question Types Inputs */}
                <div className="pt-2">
                  
                  {/* SELECCION UNICA */}
                  {preg.tipo === "seleccion_unica" && (
                    <div className="space-y-2.5">
                      {(preg.opciones || []).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${
                            val.texto === opt ? "border-blue-500 bg-blue-50/20" : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${preg.id}`}
                            checked={val.texto === opt}
                            onChange={() => handleResponseChange(preg.id, "texto", opt)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* OPCION MULTIPLE */}
                  {preg.tipo === "opcion_multiple" && (
                    <div className="space-y-2.5">
                      {(preg.opciones || []).map((opt) => {
                        const checked = Array.isArray(val.opciones) && val.opciones.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${
                              checked ? "border-violet-500 bg-violet-50/20" : "border-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleResponseChange(preg.id, "opcion_multiple", opt)}
                              className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                            />
                            <span className="text-sm font-semibold text-slate-700">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* SI NO */}
                  {preg.tipo === "si_no" && (
                    <div className="flex gap-4">
                      {["Sí", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleResponseChange(preg.id, "texto", opt)}
                          className={`flex-1 py-3.5 text-center font-bold rounded-xl border text-sm transition-all ${
                            val.texto === opt
                              ? opt === "Sí"
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                                : "bg-rose-600 border-rose-600 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ESCALA (1 - 10) */}
                  {preg.tipo === "escala" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleResponseChange(preg.id, "escala", num)}
                            className={`h-11 font-bold rounded-lg border text-sm transition-all flex items-center justify-center ${
                              val.escala === num
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm scale-105"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 pt-1 uppercase tracking-wider">
                        <span>Muy Insatisfecho / Mal</span>
                        <span>Excelente / Muy Satisfecho</span>
                      </div>
                    </div>
                  )}

                  {/* TEXTO LIBRE */}
                  {preg.tipo === "texto_libre" && (
                    <div>
                      <textarea
                        value={val.texto || ""}
                        onChange={(e) => handleResponseChange(preg.id, "texto", e.target.value)}
                        placeholder="Escribe tu respuesta libre aquí..."
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
                      />
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-150 uppercase tracking-wider text-sm"
            >
              {submitting ? "Enviando respuestas..." : "Enviar Respuestas"}
            </button>
          </div>

        </form>

        <div className="text-center text-xs text-slate-400 py-6">
          Encuesta provista de forma segura por CenPlus.
        </div>
      </div>
    </div>
  );
}
