"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Admin = { email: string; role: string; hasPassword: boolean };

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { tables: number; orders: number };
  admins: Admin[];
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Restaurant | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    setSuccess(`Restaurante "${form.restaurantName}" creado. El dueño puede ingresar con ${form.adminEmail}.`);
    setTimeout(() => setSuccess(null), 6000);
    fetchRestaurants();
    setCreating(false);
  }

  async function handleToggle(restaurant: Restaurant) {
    setTogglingId(restaurant.id);
    const res = await fetch("/api/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, isActive: !restaurant.isActive }),
    });
    if (res.ok) {
      setRestaurants((prev) =>
        prev.map((r) => r.id === restaurant.id ? { ...r, isActive: !restaurant.isActive } : r)
      );
    }
    setTogglingId(null);
  }

  async function handleDelete(restaurant: Restaurant) {
    setDeletingId(restaurant.id);
    const res = await fetch("/api/setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id }),
    });
    if (res.ok) {
      setRestaurants((prev) => prev.filter((r) => r.id !== restaurant.id));
    }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const activeCount = restaurants.filter((r) =>
    r.admins.some((a) => a.hasPassword)
  ).length;
  const pendingCount = restaurants.length - activeCount;

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Gradientes — mismo fondo que el login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-orange-700/8 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl select-none shadow">🍽️</div>
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

        {/* Stats */}
        {!loading && restaurants.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{restaurants.length}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Restaurantes</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Con cuenta activa</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Pendientes</p>
            </div>
          </div>
        )}

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-sm rounded-xl px-4 py-3 mb-4"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-200">Restaurantes</h2>
          <button
            onClick={() => { setShowForm((v) => !v); setError(null); }}
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
                  <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Nombre</label>
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
                  <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 gap-1">
                    <span className="text-zinc-600 text-sm font-mono">/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      required
                      placeholder="el-gaucho"
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-600 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Email del dueño</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                    required
                    placeholder="dueño@restoran.com"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600"
                  />
                  <p className="text-xs text-zinc-600 mt-1">El dueño ingresa con este email (Google o contraseña).</p>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={creating}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
                    {creating ? "Creando..." : "Crear restaurante"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                    className="text-zinc-500 hover:text-white text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-all">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🍽️</p>
            <p className="text-zinc-400 text-sm font-medium">No hay restaurantes todavía</p>
            <p className="text-zinc-600 text-xs mt-1">Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const owner = r.admins.find((a) => a.role === "OWNER") ?? r.admins[0];
              const isActive = owner?.hasPassword;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Nombre + slug */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{r.name}</h3>
                        <span className="text-zinc-600 font-mono text-xs shrink-0 bg-zinc-800 px-1.5 py-0.5 rounded">/{r.slug}</span>
                      </div>

                      {/* Owner + estado cuenta */}
                      {owner && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-xs truncate">{owner.email}</span>
                          {isActive ? (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                              Cuenta activa
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                              Sin cuenta
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-3 mt-2 text-xs text-zinc-600">
                        <span>{r._count.tables} {r._count.tables === 1 ? "mesa" : "mesas"}</span>
                        <span>{r._count.orders} {r._count.orders === 1 ? "pedido" : "pedidos"}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <a
                        href={`/admin?restaurant=${r.slug}`}
                        className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all text-center"
                      >
                        Ver panel
                      </a>
                      <button
                        onClick={() => handleToggle(r)}
                        disabled={togglingId === r.id}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                          r.isActive
                            ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                            : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                        }`}
                      >
                        {togglingId === r.id ? "..." : r.isActive ? "Suspender" : "Activar"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        className="text-xs text-red-500/70 hover:text-red-400 hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal confirmar borrado */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-1">¿Eliminar restaurante?</h3>
              <p className="text-zinc-400 text-sm mb-1">
                Vas a eliminar <span className="text-white font-semibold">{confirmDelete.name}</span>.
              </p>
              <p className="text-red-400 text-xs mb-5">Esta acción borra el restaurante, sus mesas y pedidos. No se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingId === confirmDelete.id}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-all"
                >
                  {deletingId === confirmDelete.id ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
