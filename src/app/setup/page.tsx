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
  status: string;
  subscriptionEndsAt: string | null;
  createdAt: string;
  _count: { tables: number; orders: number };
  admins: Admin[];
};

function SubscriptionBadge({ endsAt, onExtend }: { endsAt: string | null; onExtend: (months: number) => void }) {
  const [open, setOpen] = useState(false);

  const daysLeft = endsAt
    ? Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const badgeColor = daysLeft === null
    ? "bg-gray-100 text-gray-400 border-gray-200"
    : daysLeft <= 0
    ? "bg-red-50 text-red-600 border-red-200"
    : daysLeft <= 7
    ? "bg-orange-50 text-orange-600 border-orange-200"
    : daysLeft <= 15
    ? "bg-amber-50 text-amber-600 border-amber-200"
    : "bg-emerald-50 text-emerald-600 border-emerald-200";

  const badgeText = daysLeft === null
    ? "Sin suscripción"
    : daysLeft <= 0
    ? "Vencida"
    : `${daysLeft} día${daysLeft !== 1 ? "s" : ""} restantes`;

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center text-[11px] font-semibold border px-2 py-0.5 rounded-full ${badgeColor}`}>
          {daysLeft !== null && daysLeft > 0 && "🕐 "}{badgeText}
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
        >
          {open ? "Cerrar" : "Extender"}
        </button>
      </div>
      {open && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[1, 3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => { onExtend(m); setOpen(false); }}
              className="text-[11px] font-semibold bg-blue-900 hover:bg-blue-800 text-white px-2.5 py-1 rounded-lg transition-all"
            >
              +{m === 12 ? "1 año" : `${m} mes${m > 1 ? "es" : ""}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkCopiable({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest w-7 shrink-0">{label}</span>
      <span className="text-[10px] text-gray-500 font-mono truncate flex-1 bg-gray-100 px-2 py-1 rounded">{url}</span>
      <button onClick={copy} className="shrink-0 text-[10px] text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-all">
        {copied ? "✓" : "Copiar"}
      </button>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ restaurantName: "", slug: "", adminEmail: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Restaurant | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/setup", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRestaurants(data.restaurants);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
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

  async function handleEnable(restaurant: Restaurant) {
    setTogglingId(restaurant.id);
    const res = await fetch("/api/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, status: "ACTIVE" }),
    });
    if (res.ok) {
      setRestaurants((prev) =>
        prev.map((r) => r.id === restaurant.id ? { ...r, status: "ACTIVE" } : r)
      );
    }
    setTogglingId(null);
  }

  async function handleExtendSubscription(restaurant: Restaurant, months: number) {
    const base = restaurant.subscriptionEndsAt && new Date(restaurant.subscriptionEndsAt) > new Date()
      ? new Date(restaurant.subscriptionEndsAt)
      : new Date();
    const newDate = new Date(base);
    newDate.setMonth(newDate.getMonth() + months);

    const res = await fetch("/api/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, subscriptionEndsAt: newDate.toISOString() }),
    });
    if (res.ok) {
      setRestaurants((prev) =>
        prev.map((r) => r.id === restaurant.id ? { ...r, subscriptionEndsAt: newDate.toISOString() } : r)
      );
    }
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
    <div className="min-h-screen bg-slate-100">

      {/* Hero header — mismo estilo que panel admin */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pb-8 mb-6"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg backdrop-blur-sm">🍽️</div>
              <span className="font-bold text-white text-lg tracking-tight">Panel Superadmin</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
          <h1 className="text-white font-bold text-2xl">Gestión de restaurantes</h1>
        </div>

        {/* Stats dentro del hero */}
        {!loading && restaurants.length > 0 && (
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{restaurants.length}</span>
              <span className="text-white/60 text-xs">Restaurantes</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-300">{activeCount}</span>
              <span className="text-white/60 text-xs">Activos</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-amber-300">{pendingCount}</span>
              <span className="text-white/60 text-xs">Pendientes</span>
            </div>
          </div>
        )}
      </div>{/* cierre hero */}

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Restaurantes</h2>
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
              className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm"
            >
              <h3 className="font-semibold text-sm text-gray-700 mb-4">Nuevo restaurante</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.restaurantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="El Gaucho"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Slug (URL)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-1">
                    <span className="text-gray-400 text-sm font-mono">/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      required
                      placeholder="el-gaucho"
                      className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none placeholder:text-gray-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Email del dueño</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                    required
                    placeholder="dueño@restoran.com"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">El dueño ingresa con este email (Google o contraseña).</p>
                </div>

                {error && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={creating}
                    className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
                    {creating ? "Creando..." : "Crear restaurante"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                    className="text-gray-500 hover:text-gray-900 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all">
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
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-3xl mb-3">🍽️</p>
            <p className="text-gray-500 text-sm font-medium">No hay restaurantes todavía</p>
            <p className="text-gray-300 text-xs mt-1">Creá el primero con el botón de arriba.</p>
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
                  className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-300 transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Nombre + slug */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{r.name}</h3>
                        <span className="text-gray-400 font-mono text-xs shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">/{r.slug}</span>
                        {r.status === "PENDING" && (
                          <span className="shrink-0 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>
                        )}
                      </div>

                      {/* Owner + estado cuenta */}
                      {owner && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs truncate">{owner.email}</span>
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
                      <div className="flex gap-3 mt-2 mb-3 text-xs text-gray-400">
                        <span>{r._count.tables} {r._count.tables === 1 ? "mesa" : "mesas"}</span>
                        <span>{r._count.orders} {r._count.orders === 1 ? "pedido" : "pedidos"}</span>
                      </div>

                      {/* Suscripción */}
                      <SubscriptionBadge
                        endsAt={r.subscriptionEndsAt}
                        onExtend={(months) => handleExtendSubscription(r, months)}
                      />

                      {/* Links generados */}
                      <div className="space-y-1.5">
                        <LinkCopiable
                          label="Menú"
                          url={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://payments-qr.vercel.app"}/menu/${r.slug}`}
                        />
                        <LinkCopiable
                          label="API"
                          url={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://payments-qr.vercel.app"}/api/menu?slug=${r.slug}`}
                        />
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {r.status === "PENDING" && (
                        <button
                          onClick={() => handleEnable(r)}
                          disabled={togglingId === r.id}
                          className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 text-center"
                        >
                          {togglingId === r.id ? "..." : "Habilitar"}
                        </button>
                      )}
                      {owner?.hasPassword ? (
                        <a
                          href={`/api/setup/impersonate?restaurantId=${r.id}`}
                          className="text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all text-center"
                        >
                          Ver panel
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg text-center cursor-not-allowed" title="El dueño aún no activó su cuenta">
                          Sin cuenta
                        </span>
                      )}
                      <button
                        onClick={() => handleToggle(r)}
                        disabled={togglingId === r.id}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                          r.isActive
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
      </div>{/* cierre contenido */}

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
              className="bg-white border border-gray-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-3xl mb-3 text-center">⚠️</div>
              <h3 className="font-bold text-lg mb-1 text-center">¿Estás seguro?</h3>
              <p className="text-gray-500 text-sm mb-1 text-center">
                Vas a eliminar <span className="text-gray-900 font-semibold">{confirmDelete.name}</span>.
              </p>
              <p className="text-red-500 text-xs mb-5 text-center">Esta acción borra el restaurante, sus mesas y pedidos. No se puede deshacer.</p>
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2.5 rounded-xl transition-all"
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
