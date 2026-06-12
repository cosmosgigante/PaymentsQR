"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PLANS, formatArs, formatDate, paymentSourceLabel, type PlanType, type PaymentSource } from "@/lib/plans";
import UsersManager from "./UsersManager";
import ActivityFeed from "./ActivityFeed";
import { Store, Users, Activity } from "lucide-react";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  _count: { tables: number; orders: number };
};

type Tab = "restoranes" | "usuarios" | "actividad";

type Account = {
  ownerEmail: string;
  name: string | null;
  planType: string | null;
  priceArs: number | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  paymentSource: string | null;
  isActive: boolean;
};

export default function CuentaClient({ account, restaurants: initial }: { account: Account; restaurants: Restaurant[] }) {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("restoranes");

  const planLabel = account.planType && account.planType in PLANS ? PLANS[account.planType as PlanType].label : "—";
  const daysLeft = account.subscriptionEndsAt
    ? Math.ceil((new Date(account.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  function handleName(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm({ name, slug });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/account/restaurants", {
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
    setRestaurants((prev) => [...prev, { ...data.restaurant, isActive: true, createdAt: new Date().toISOString(), _count: { tables: 0, orders: 0 } }]);
    setShowForm(false);
    setForm({ name: "", slug: "" });
    setSuccess(`"${data.restaurant.name}" se creó y quedó pendiente de habilitación. Te avisamos cuando esté listo.`);
    setTimeout(() => setSuccess(null), 8000);
    setCreating(false);
  }

  async function handleSignOut() {
    await fetch("/api/auth/login", { method: "DELETE" }); // borra el JWT admin_token
    const supabase = createClient();
    await supabase.auth.signOut(); // cierra también la sesión de Google/Supabase
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Hero */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pb-8 mb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg backdrop-blur-sm">🏢</div>
              <span className="font-bold text-white text-lg tracking-tight">Mi cuenta</span>
            </div>
            <button onClick={handleSignOut} className="text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
              Cerrar sesión
            </button>
          </div>
          <h1 className="text-white font-bold text-2xl">{account.name ?? account.ownerEmail}</h1>

          {/* Datos del plan */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs">Plan</span>
              <span className="text-sm font-bold text-white">{planLabel}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs">Precio</span>
              <span className="text-sm font-bold text-emerald-300">{account.priceArs != null ? `${formatArs(account.priceArs)} ARS` : "—"}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs">Vence</span>
              <span className={`text-sm font-bold ${daysLeft !== null && daysLeft <= 7 ? "text-orange-300" : "text-white"}`}>
                {account.subscriptionEndsAt ? formatDate(account.subscriptionEndsAt) : "—"}
                {daysLeft !== null && daysLeft > 0 && <span className="text-white/50 font-normal"> ({daysLeft}d)</span>}
              </span>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-2">
            {account.ownerEmail} · {paymentSourceLabel(account.paymentSource as PaymentSource)}
          </p>
        </div>
      </div>

      {/* Barra de pestañas */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 mb-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1 flex gap-1">
          {([
            { key: "restoranes", label: "Mis restoranes", icon: Store },
            { key: "usuarios",   label: "Usuarios y permisos", icon: Users },
            { key: "actividad",  label: "Actividad", icon: Activity },
          ] as { key: Tab; label: string; icon: typeof Store }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-2 py-2.5 rounded-xl transition-all ${
                tab === key ? "bg-blue-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon size={15} strokeWidth={2} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {tab === "restoranes" && (
        <>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mis restoranes</h2>
          <button onClick={() => { setShowForm((v) => !v); setError(null); }}
            className="bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
            + Nuevo restorán
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm text-gray-700 mb-1">Nuevo restorán / sucursal</h3>
              <p className="text-xs text-gray-400 mb-4">Se crea pendiente de habilitación. Se cobra como sucursal extra según tu plan.</p>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => handleName(e.target.value)} required placeholder="Mi otra sucursal"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">URL</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-1">
                    <span className="text-gray-400 text-sm font-mono">/</span>
                    <input type="text" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} required placeholder="mi-otra-sucursal"
                      className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none placeholder:text-gray-300 font-mono" />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={creating}
                  className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
                  {creating ? "Creando..." : "Crear restorán"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {restaurants.map((r) => {
            const active = r.status === "ACTIVE" && r.isActive;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                    {r.status === "ACTIVE"
                      ? <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">Activo</span>
                      : <span className="text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">/{r.slug} · {r._count.tables} mesas · {r._count.orders} pedidos</p>
                </div>
                {active ? (
                  <a href={`/api/account/enter?restaurantId=${r.id}`}
                    className="shrink-0 bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                    Entrar
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-amber-600 font-medium px-3">Esperando habilitación</span>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}

        {tab === "usuarios" && (
          <UsersManager restaurants={restaurants} />
        )}

        {tab === "actividad" && (
          <ActivityFeed restaurants={restaurants} />
        )}
      </div>
    </div>
  );
}
