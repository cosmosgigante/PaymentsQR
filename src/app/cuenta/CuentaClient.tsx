"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import UsersManager from "./UsersManager";
import ActivityFeed from "./ActivityFeed";
import { Store, Users, Activity, Settings, ChevronLeft, Building2, CreditCard, BarChart3 } from "lucide-react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";
import { VERTICALS, verticalMeta, type VerticalKey } from "@/lib/verticals";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  vertical?: string;
  _count: { tables: number; orders: number };
};

type Tab = "restoranes" | "usuarios" | "actividad";

type Account = {
  id: string;
  ownerEmail: string;
  name: string | null;
  planType: string | null;
  priceArs: number | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  paymentSource: string | null;
  isActive: boolean;
  pendingPlanType: string | null;
  membershipActive: boolean;
};

export default function CuentaClient({ account, restaurants: initial, isFull = true }: { account: Account; restaurants: Restaurant[]; isFull?: boolean }) {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [vertical, setVertical] = useState<VerticalKey>("GASTRONOMICO");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("restoranes");
  const [requestingPlan, setRequestingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("MENSUAL");

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
      body: JSON.stringify({ ...form, vertical }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear el negocio");
      setCreating(false);
      return;
    }
    setRestaurants((prev) => [...prev, { ...data.restaurant, isActive: true, createdAt: new Date().toISOString(), _count: { tables: 0, orders: 0 } }]);
    setShowForm(false);
    setForm({ name: "", slug: "" });
    setVertical("GASTRONOMICO");
    setSuccess(`"${data.restaurant.name}" se creó y quedó pendiente de habilitación. Te avisamos cuando esté listo.`);
    setTimeout(() => setSuccess(null), 8000);
    setCreating(false);
  }

  async function handleSignOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function requestMembership() {
    setRequestingPlan(true);
    await fetch(`/api/orgs/${account.id}/membership`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType: selectedPlan }),
    });
    setRequestingPlan(false);
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
            <div className="flex items-center gap-3">
              {/* Mi Perfil → vuelve al selector de orgs */}
              <Link href="/perfil" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm">
                <ChevronLeft size={16} /><span className="hidden sm:inline">Mis orgs</span>
              </Link>
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-white/70" />
                {isFull ? (
                  <Link href="/cuenta/config" className="flex items-center gap-1 group">
                    <span className="font-bold text-white text-lg tracking-tight">{account.name ?? "Mi organización"}</span>
                    <Settings size={14} className="text-white/40 group-hover:text-white transition-colors ml-1" />
                  </Link>
                ) : (
                  <span className="font-bold text-white text-lg tracking-tight">{account.name ?? "Mi organización"}</span>
                )}
              </div>
            </div>
            <button onClick={handleSignOut} className="text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
              Salir
            </button>
          </div>
          <h1 className="text-white font-bold text-2xl">{account.name ?? account.ownerEmail}</h1>
          <p className="text-white/40 text-xs mt-1">
            {account.ownerEmail}
            {isFull && <> · <Link href="/cuenta/config" className="underline hover:text-white/70">ver plan y configuración</Link></>}
          </p>
        </div>
      </div>

      {/* Muro de membresía — bloquea el dashboard completo si no hay plan activo */}
      {!account.membershipActive && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center">
            <CreditCard size={36} className="text-blue-900 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Activá la membresía para operar</h2>
            {account.pendingPlanType ? (
              <div className="mt-3">
                <p className="text-gray-500 text-sm">Tu solicitud de plan <strong>{account.pendingPlanType}</strong> está pendiente de aprobación.</p>
                <p className="text-gray-400 text-xs mt-1">Te avisamos cuando esté activo.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-5">Elegí un plan para empezar a gestionar tu organización.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                    <button key={pt} type="button" onClick={() => setSelectedPlan(pt)}
                      className={`rounded-xl p-4 border-2 text-left transition-all ${selectedPlan === pt ? "border-blue-900 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"}`}>
                      <p className="font-bold text-gray-900 text-sm">{PLANS[pt].label}</p>
                      <p className="text-blue-900 font-bold text-lg mt-1">{formatArs(PLANS[pt].priceArs)}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{PLANS[pt].months === 1 ? "por mes" : `por ${PLANS[pt].months} meses`}</p>
                    </button>
                  ))}
                </div>
                <button onClick={requestMembership} disabled={requestingPlan}
                  className="bg-blue-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-all">
                  {requestingPlan ? "Enviando solicitud..." : `Solicitar plan ${PLANS[selectedPlan].label}`}
                </button>
                <p className="text-gray-400 text-xs mt-3">Un gestor aprobará tu membresía y te notificará. Mientras tanto podés configurar tu organización.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barra de pestañas — solo para acceso completo y con membresía */}
      {isFull && account.membershipActive && (
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
      )}

      {account.membershipActive && <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
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
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-800">Mis restoranes</h2>
            <Link href="/cuenta/reportes" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all">
              <BarChart3 size={13} /> Reportes
            </Link>
          </div>
          {isFull && (
            <button onClick={() => { setShowForm((v) => !v); setError(null); }}
              className="bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
              + Nuevo negocio
            </button>
          )}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm text-gray-700 mb-1">Nuevo negocio</h3>
              <p className="text-xs text-gray-400 mb-4">Se crea pendiente de habilitación. Se cobra como negocio extra según tu plan.</p>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Categoría</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VERTICALS.map((v) => (
                      <button key={v.key} type="button" onClick={() => setVertical(v.key)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${vertical === v.key ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <span className="text-lg">{v.emoji}</span>
                        <p className="font-semibold text-sm text-gray-800 leading-tight mt-1">{v.label}</p>
                        <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{v.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => handleName(e.target.value)} required
                    placeholder={vertical === "KIOSCO_DESPENSA" ? "Kiosco La Esquina" : "Mi otra sucursal"}
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
                  {creating ? "Creando..." : "Crear negocio"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {restaurants.map((r) => {
            const active = r.status === "ACTIVE" && r.isActive;
            const meta = verticalMeta(r.vertical ?? "GASTRONOMICO");
            const isGastro = (r.vertical ?? "GASTRONOMICO") === "GASTRONOMICO";
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                    <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{meta.emoji} {meta.label}</span>
                    {r.status === "ACTIVE"
                      ? <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">Activo</span>
                      : <span className="text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">/{r.slug}{isGastro ? ` · ${r._count.tables} mesas` : ""} · {r._count.orders} pedidos</p>
                </div>
                {active ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/cuenta/ajustes/${r.id}`}
                      className="text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all">
                      Ajustes
                    </Link>
                    <a href={`/api/account/enter?restaurantId=${r.id}`}
                      className="bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                      Ingresar
                    </a>
                  </div>
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
      </div>}
    </div>
  );
}
