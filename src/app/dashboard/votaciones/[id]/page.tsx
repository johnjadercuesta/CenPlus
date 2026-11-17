"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authHeaders } from "@/lib/api";

interface Pregunta {
  id?: number;
  texto: string;
  tipo: "seleccion_unica" | "opcion_multiple" | "texto_libre" | "escala" | "si_no";
  opciones: string[];
  obligatoria: boolean;
}

export default function EditarVotacionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<"encuesta" | "votacion" | "investigacion">("encuesta");
  const [audiencia, setAudiencia] = useState<"app_users" | "ciudadanos" | "publico">("publico");
  const [limiteRespuestas, setLimiteRespuestas] = useState<"una_por_sesion" | "una_por_ciudadano" | "multiples">("una_por_sesion");
  const [visibilidadResultados, setVisibilidadResultados] = useState<"app_users" | "ciudadanos" | "publico">("app_users");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [anonima, setAnonima] = useState(true);
  const [estado, setEstado] = useState<"borrador" | "activa" | "cerrada">("borrador");
  const [dimensiones, setDimensiones] = useState<string[]>([]);

  const DIMENSIONES_OPTS = [
    { value: "sexo", label: "Sexo" },
    { value: "edad_rango", label: "Edad" },
    { value: "zona", label: "Zona (Urbana/Rural)" },
    { value: "comuna", label: "Comuna / Corregimiento" },
    { value: "barrio", label: "Barrio / Vereda" },
    { value: "nivel_estudios", label: "Nivel de Estudios" },
    { value: "regimen_salud", label: "Régimen de Salud" },
    { value: "es_lider", label: "Líder" },
    { value: "ocupacion", label: "Ocupación" },
  ];

  const toggleDimension = (val: string) => {
    setDimensiones(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]);
  };

  // Questions state
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchEncuesta = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/votaciones/${id}`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          const enc = data.data;
          setTitulo(enc.titulo || "");
          setDescripcion(enc.descripcion || "");
          setTipo(enc.tipo || "encuesta");
          setAudiencia(enc.audiencia || "publico");
          setLimiteRespuestas(enc.limite_respuestas || "una_por_sesion");
          setVisibilidadResultados(enc.visibilidad_resultados || "app_users");
          setAnonima(enc.anonima !== false);
          setEstado(enc.estado || "borrador");
          setDimensiones(Array.isArray(enc.dimensiones) ? enc.dimensiones : []);

          // Formatear fechas para input datetime-local (YYYY-MM-DDTHH:MM)
          if (enc.fecha_inicio) {
            setFechaInicio(new Date(enc.fecha_inicio).toISOString().slice(0, 16));
          }
          if (enc.fecha_fin) {
            setFechaFin(new Date(enc.fecha_fin).toISOString().slice(0, 16));
          }

          // Formatear preguntas
          const pregs = (enc.preguntas || []).map((p: any) => ({
            id: p.id,
            texto: p.texto,
            tipo: p.tipo,
            opciones: Array.isArray(p.opciones) ? p.opciones : [],
            obligatoria: p.obligatoria !== false,
          }));
          setPreguntas(pregs);
        } else {
          setError(data.error || "No se encontró la encuesta");
        }
      } catch (err) {
        setError("Error de conexión al cargar la encuesta");
      } finally {
        setLoading(false);
      }
    };
    fetchEncuesta();
  }, [id]);

  const handleAddQuestion = () => {
    setPreguntas((prev) => [
      ...prev,
      { texto: "", tipo: "seleccion_unica", opciones: ["Opción 1", "Opción 2"], obligatoria: true }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setPreguntas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Pregunta, value: any) => {
    setPreguntas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleAddOption = (qIndex: number) => {
    setPreguntas((prev) =>
      prev.map((p, i) => {
        if (i === qIndex) {
          return { ...p, opciones: [...p.opciones, `Opción ${p.opciones.length + 1}`] };
        }
        return p;
      })
    );
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setPreguntas((prev) =>
      prev.map((p, i) => {
        if (i === qIndex) {
          if (p.opciones.length <= 1) return p;
          return { ...p, opciones: p.opciones.filter((_, oi) => oi !== optIndex) };
        }
        return p;
      })
    );
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    setPreguntas((prev) =>
      prev.map((p, i) => {
        if (i === qIndex) {
          const updated = [...p.opciones];
          updated[optIndex] = val;
          return { ...p, opciones: updated };
        }
        return p;
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado !== "borrador") return;

    setError(null);
    if (!titulo.trim()) {
      setError("El título es obligatorio");
      return;
    }

    // Validar preguntas
    for (let i = 0; i < preguntas.length; i++) {
      const q = preguntas[i];
      if (!q.texto.trim()) {
        setError(`La pregunta #${i + 1} no tiene texto`);
        return;
      }
      if (["seleccion_unica", "opcion_multiple"].includes(q.tipo)) {
        const validOpts = q.opciones.filter((o) => o.trim());
        if (validOpts.length < 2) {
          setError(`La pregunta #${i + 1} requiere al menos 2 opciones válidas`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const payload = {
        titulo,
        descripcion,
        tipo,
        audiencia,
        limite_respuestas: limiteRespuestas,
        visibilidad_resultados: visibilidadResultados,
        anonima,
        dimensiones,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        preguntas: preguntas.map((q) => ({
          texto: q.texto,
          tipo: q.tipo,
          opciones: ["seleccion_unica", "opcion_multiple"].includes(q.tipo) ? q.opciones.filter(o => o.trim()) : null,
          obligatoria: q.obligatoria,
        })),
      };

      const res = await fetch(`/api/votaciones/${id}`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Cambios guardados con éxito");
        router.push("/dashboard/votaciones");
      } else {
        setError(data.error || "Error al actualizar la encuesta");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleActivar = async () => {
    if (!confirm("Al activar la encuesta no podrás editarla nuevamente. ¿Deseas continuar?")) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/votaciones/${id}/activar`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: "activa" }),
      });
      if (res.ok) {
        alert("Encuesta publicada!");
        router.push("/dashboard/votaciones");
      } else {
        const data = await res.json();
        setError(data.error || "Error al activar la encuesta");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner border-t-blue-500 mb-3" style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p className="text-slate-500 font-medium">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (estado !== "borrador") {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-slate-800">Esta encuesta no se puede editar</h2>
        <p className="text-slate-500 mt-2">
          La encuesta se encuentra en estado <strong className="text-blue-600">{estado}</strong>. Solo las encuestas en estado borrador pueden ser editadas para evitar incoherencias en las respuestas recopiladas.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button onClick={() => router.push("/dashboard/votaciones")} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all">
            Volver a la lista
          </button>
          <button onClick={() => router.push(`/dashboard/votaciones/${id}/resultados`)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all">
            Ver resultados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard/votaciones")} className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
          ← Volver a Votaciones
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Editar Encuesta</h1>
          <p className="text-slate-500 mt-1">Modifica los detalles y la estructura de preguntas antes de activarla</p>
        </div>
        <button
          type="button"
          onClick={handleActivar}
          disabled={saving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
        >
          🚀 Activar / Publicar
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg mb-6">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-3">Información General</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título del Formulario *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de la encuesta"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción o Propósito</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Escribe aquí el propósito del formulario..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Formulario</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="encuesta">Encuesta General</option>
                <option value="votacion">Votación Formal</option>
                <option value="investigacion">Investigación de Mercado/Opinión</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">¿Quién puede responder?</label>
              <select
                value={audiencia}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setAudiencia(val);
                  if (val === "app_users") {
                    setLimiteRespuestas("una_por_sesion");
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="publico">Abierto a todo público</option>
                <option value="ciudadanos">Solo ciudadanos registrados en la base de datos</option>
                <option value="app_users">Solo usuarios de la aplicación (cuentas de usuario)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-3">Reglas de Envío e Historial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Límite de Respuestas</label>
              <select
                value={limiteRespuestas}
                onChange={(e) => setLimiteRespuestas(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="una_por_sesion">Una sola respuesta por sesión (Cookies/Navegador)</option>
                {audiencia !== "app_users" && (
                  <option value="una_por_ciudadano">Una sola respuesta por ciudadano (Cédula)</option>
                )}
                <option value="multiples">Múltiples respuestas (Sin restricciones)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">¿Quién puede ver resultados?</label>
              <select
                value={visibilidadResultados}
                onChange={(e) => setVisibilidadResultados(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="app_users">Solo administradores y estrategas (Privado)</option>
                <option value="ciudadanos">Usuarios registrados y ciudadanos</option>
                <option value="publico">Cualquier persona con el enlace (Público)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonima-chk"
              checked={anonima}
              onChange={(e) => setAnonima(e.target.checked)}
              className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="anonima-chk" className="text-sm font-medium text-slate-700 cursor-pointer">
              Encuesta anónima (No asociar respuestas a identidad)
            </label>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Análisis y Segmentación</h3>
            <p className="text-xs text-slate-400 mb-3">Selecciona las dimensiones demográficas disponibles para desglosar los resultados en los gráficos.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DIMENSIONES_OPTS.map(d => (
                <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dimensiones.includes(d.value)}
                    onChange={() => toggleDimension(d.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Apertura (Opcional)</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Cierre (Opcional)</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Questions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-800">Preguntas de la Encuesta</h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded transition-all"
            >
              + Añadir Pregunta
            </button>
          </div>

          <div className="space-y-8">
            {preguntas.map((q, idx) => (
              <div key={idx} className="p-5 border border-slate-200 rounded-xl relative bg-slate-50/50 space-y-4">
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="absolute top-4 right-4 w-7 h-7 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 font-bold transition-all text-xs"
                  title="Eliminar pregunta"
                >
                  ×
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center">{idx + 1}</span>
                  <h4 className="text-sm font-bold text-slate-700">Pregunta</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Texto de la Pregunta *</label>
                  <input
                    type="text"
                    value={q.texto}
                    onChange={(e) => handleQuestionChange(idx, "texto", e.target.value)}
                    placeholder="Texto de la pregunta"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Respuesta</label>
                    <select
                      value={q.tipo}
                      onChange={(e) => handleQuestionChange(idx, "tipo", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition-all text-sm"
                    >
                      <option value="seleccion_unica">Selección Única (Radio)</option>
                      <option value="opcion_multiple">Selección Múltiple (Checkbox)</option>
                      <option value="si_no">Sí / No</option>
                      <option value="escala">Escala de Calificación (1 - 10)</option>
                      <option value="texto_libre">Texto Libre (Respuesta escrita)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      id={`req-${idx}`}
                      checked={q.obligatoria}
                      onChange={(e) => handleQuestionChange(idx, "obligatoria", e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`req-${idx}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                      Pregunta Obligatoria
                    </label>
                  </div>
                </div>

                {/* Options management */}
                {["seleccion_unica", "opcion_multiple"].includes(q.tipo) && (
                  <div className="space-y-2.5 border-t border-slate-200/60 pt-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500">Opciones de Respuesta</label>
                      <button
                        type="button"
                        onClick={() => handleAddOption(idx)}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        + Agregar Opción
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.opciones.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, optIdx, e.target.value)}
                            className="flex-1 bg-transparent border-none focus:outline-none text-xs text-slate-800"
                          />
                          {q.opciones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx, optIdx)}
                              className="text-rose-400 hover:text-rose-600 font-bold text-xs px-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {preguntas.length === 0 && (
            <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
              No hay preguntas agregadas aún. Añade una para comenzar.
            </div>
          )}

          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2 border border-dashed border-blue-300 hover:border-blue-500 text-blue-600 hover:bg-blue-50/30 rounded-xl text-sm font-semibold transition-all w-full max-w-xs text-center"
            >
              + Añadir otra pregunta
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <button
            type="button"
            onClick={() => router.push("/dashboard/votaciones")}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
