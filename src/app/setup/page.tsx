"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { tables: number; orders: number };
  admins: { email: string; role: string }[];
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ restaurantName: "", slug: "", adminEmail: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/setup");
    if (res.ok) {
      const data = await res.json();
      setRestaurants(data.restaurants);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
    fetchRestaurants();
  }, [fetchRestaurants]);

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm((prev) => ({ ...prev, restaurantName: name, slug }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear el restaurante");
      setCreating(false);
      return;
    }
    setShowForm(false);
    setForm({ restaurantName: "", slug: "", adminEmail: "" });
    setSuccess(`Restaurante "${form.restaurantName}" creado. El dueño puede iniciar sesión con ${form.adminEmail}.`);
    setTimeout(() => setSuccess(null), 6000);
    fetchRestaurants();
    setCreating(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg select-none">🍽️</div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Panel Superadmin</h1>
              <p className="text-zinc-500 text-xs">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-sm rounded-xl px-4 py-3 mb-6"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restaurants section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-200">
            Restaurantes
            {!loading && (
              <span className="ml-2 text-zinc-500 font-normal text-sm">({restaurants.length})</span>
            )}
          </h2>
          <button
            onClick={() => { setShowForm(true); setError(null); }}
            className="bg-white text-zinc-900 hover:bg-zinc-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            + Nuevo restaurante
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4"
            >
              <h3 className="font-semibold text-sm text-zinc-300 mb-4">Nuevo restaurante</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Nombre del restaurante</label>
                  <input
                    type="text"
                    value={form.restaurantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="El Gaucho"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    required
                    placeholder="el-gaucho"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Email del dueño / admin</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                    required
                    placeholder="dueño@restoran.com"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                  />
                  <p className="text-xs text-zinc-600 mt-1">El dueño inicia sesión con este email vía Google o email/contraseña.</p>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
                  >
                    {creating ? "Creando..." : "Crear restaurante"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setError(null); }}
                    className="text-zinc-500 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restaurant list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-500 text-sm">No hay restaurantes todavía.</p>
            <p className="text-zinc-600 text-xs mt-1">Creá el primero para un cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold truncate">{r.name}</h3>
                      <span className="text-zinc-600 font-mono text-xs shrink-0">/{r.slug}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                      {r.admins.map((a) => (
                        <span key={a.email}>{a.email} <span className="text-zinc-700">({a.role})</span></span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-600">
                    <span>{r._count.tables} mesas</span>
                    <span>{r._count.orders} pedidos</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
