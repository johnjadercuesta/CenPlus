"use client";

import { useEffect, useState, useCallback } from "react";

interface Lider {
  id: number;
  email: string;
  identificacion: string;
  nombre: string;
  role: string;
  activo: number;
  created_at: string;
}

export default function GestionLideres() {
  const [data, setData] = useState<Lider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    identificacion: "",
    password: "",
    role: "lider",
  });

  const getToken = () => localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/lideres", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json.data || []);
    } catch {
      setMessage({ type: "error", text: "Error al cargar" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ nombre: "", email: "", identificacion: "", password: "", role: "lider" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch("/api/lideres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Usuario creado" });
        resetForm();
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Error al crear" });
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const token = getToken();
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        email: form.email,
        identificacion: form.identificacion,
        role: form.role,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/lideres/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Usuario actualizado" });
        resetForm();
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Error al actualizar" });
    }
  };

  const handleToggleActive = async (id: number, activo: number) => {
    try {
      const token = getToken();
      await fetch(`/api/lideres/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activo: activo ? 0 : 1 }),
      });
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/lideres/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error });
      } else {
        setMessage({ type: "success", text: "Usuario eliminado" });
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Error al eliminar" });
    }
  };

  const handleResetPassword = async (id: number, nombre: string) => {
    if (!confirm(`¿Restablecer la contraseña de ${nombre}?`)) return;

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const tempPass = `Cen${Math.floor(1000 + Math.random() * 9000)}${chars[Math.floor(Math.random() * chars.length)]}!`;

    try {
      const token = getToken();
      const res = await fetch(`/api/lideres/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: tempPass }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Error al restablecer" });
        return;
      }
      setMessage({
        type: "success",
        text: `Contraseña de ${nombre} restablecida. Temporal: ${tempPass}`,
      });
    } catch {
      setMessage({ type: "error", text: "Error al restablecer contraseña" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: "success", text: "Contraseña copiada al portapapeles" });
    });
  };

  const startEdit = (l: Lider) => {
    setEditingId(l.id);
    setForm({ nombre: l.nombre, email: l.email, identificacion: l.identificacion || "", password: "", role: l.role });
    setShowForm(true);
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
          {message.type === "success" && message.text.includes("Temporal:") && (
            <button
              onClick={() => {
                const pass = message.text.split("Temporal: ")[1];
                if (pass) copyToClipboard(pass);
              }}
              className="ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              Copiar
            </button>
          )}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold">X</button>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: "", email: "", identificacion: "", password: "", role: "lider" }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nuevo Usuario
        </button>
      )}

      {showForm && (
        <form
          onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate}
          className="bg-white p-4 rounded-lg border shadow-sm space-y-3"
        >
          <h3 className="font-semibold text-gray-800">
            {editingId ? "Editar Usuario" : "Crear Usuario"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                placeholder="Nombre completo"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Número de Identificación</label>
              <input
                type="text"
                value={form.identificacion}
                onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                required
                placeholder="Cédula o ID"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email (Para recuperación)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="correo@ejemplo.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Contraseña {editingId && <span className="text-gray-400">(vacío = sin cambio)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className={inputClass}
                required={!editingId}
              />
            </div>
            <div>
              <label className={labelClass}>Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClass + " bg-white"}
              >
                <option value="lider">Líder</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              {editingId ? "Guardar" : "Crear"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Identificación</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Rol</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Creado</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{l.nombre}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{l.identificacion}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{l.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        l.role === "administrador"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {l.role === "administrador" ? "Admin" : "Líder"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        l.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {l.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString("es-CO") : ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(l)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(l.id, l.activo)}
                        className={`px-2 py-1 rounded text-xs text-white ${
                          l.activo ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        {l.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => handleResetPassword(l.id, l.nombre)}
                        className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600"
                      >
                        🔑 Reset
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
