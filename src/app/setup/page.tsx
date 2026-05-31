"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    secret: "",
    restaurantName: "",
    slug: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "restaurantName"
        ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }
        : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear el restaurante"); return; }
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Error de conexión. Verificá que el servidor esté corriendo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold">Listo</h2>
          <p className="text-zinc-400 mt-2">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm"
      >
        <div className="mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-5 text-xl">🍽️</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configurar restaurante</h1>
          <p className="text-zinc-500 text-sm mt-1">Solo se hace una vez</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "secret", label: "Clave de setup (valor de SETUP_SECRET en el archivo .env)", placeholder: "Ej: gaucho123", type: "text" },
            { name: "restaurantName", label: "Nombre del restaurante", placeholder: "El Gaucho", type: "text" },
            { name: "slug", label: "Slug (URL)", placeholder: "el-gaucho", type: "text" },
            { name: "adminEmail", label: "Email admin", placeholder: "vos@restaurante.com", type: "email" },
            { name: "adminPassword", label: "Contraseña", placeholder: "Mínimo 8 caracteres", type: "password" },
          ].map((field) => (
            <div key={field.name}>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block mb-2">
                {field.label}
              </label>
              <input
                name={field.name}
                type={field.type}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                required
                placeholder={field.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
              />
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-950/40 border border-red-900/40 rounded-lg py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold py-3 rounded-xl transition-all text-sm mt-2"
          >
            {loading ? "Creando..." : "Crear restaurante"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
