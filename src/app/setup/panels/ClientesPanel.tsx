"use client";

import { useState, useEffect, useCallback } from "react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";

type RestaurantLite = { id: string; name: string; slug: string; isActive: boolean; status: string; _count: { tables: number; orders: number } };
type Member = { email: string; role: string; accessScope: string | null; hasPassword: boolean; clientClass: string };
type Client = {
  id: string; ownerEmail: string; name: string | null;
  planType: string | null; priceArs: number | null; subscriptionEndsAt: string | null;
  isActive: boolean; membershipActive: boolean;
  members: Member[]; restaurants: RestaurantLite[];
};

function daysLeft(endsAt: string | null) {
  return endsAt ? Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000) : null;
}

export default function ClientesPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [legacy, setLegacy] = useState<RestaurantLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ restaurantName: "", slug: "", adminEmail: "", planType: "MENSUAL" as PlanType });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/setup/clients", { cache: "no-store" });
    if (res.ok) { const d = await res.json(); setClients(d.clients); setLegacy(d.legacyRestaurants ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError(null);
    const res = await fetch("/api/setup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setError(d.error ?? "Error al crear el cliente"); return; }
    setShowForm(false);
    setMsg(`Cliente A "${form.restaurantName}" creado. Entra con ${form.adminEmail} (Google).`);
    setForm({ restaurantName: "", slug: "", adminEmail: "", planType: "MENSUAL" });
    setTimeout(() => setMsg(null), 6000);
    load();
  }

  async function extendSub(c: Client, months: number) {
    const base = c.subscriptionEndsAt && new Date(c.subscriptionEndsAt) > new Date() ? new Date(c.subscriptionEndsAt) : new Date();
    base.setMonth(base.getMonth() + months);
    await fetch("/api/setup", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: c.id, subscriptionEndsAt: base.toISOString() }),
    });
    load();
  }

  async function patchRestaurant(id: string, data: Record<string, unknown>) {
    await fetch("/api/setup", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurantId: id, ...data }),
    });
    load();
  }

  async function deleteRestaurant(r: RestaurantLite) {
    if (!confirm(`Eliminar "${r.name}"? Borra sus mesas y pedidos. No se puede deshacer.`)) return;
    const res = await fetch("/api/setup", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurantId: r.id }),
    });
    if (res.ok) load();
  }

  const handleName = (name: string) =>
    setForm((p) => ({ ...p, restaurantName: name, slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes A</h1>
          <p className="text-gray-400 text-sm">{clients.length} cliente{clients.length === 1 ? "" : "s"} registrados</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="bg-gray-900 text-white hover:bg-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
          + Nuevo Cliente A
        </button>
      </div>

      {msg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">{msg}</p>}

      {showForm && (
        <form onSubmit={createClient} className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">Nuevo Cliente A</h3>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Negocio / primer restorán</label>
            <input value={form.restaurantName} onChange={(e) => handleName(e.target.value)} required placeholder="El Gaucho"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Slug (URL)</label>
            <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} required placeholder="el-gaucho"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Gmail del cliente</label>
            <input type="email" value={form.adminEmail} onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))} required placeholder="cliente@gmail.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <p className="text-xs text-gray-400 mt-1">Obligatorio Gmail — el cliente entra con Google.</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                <button key={pt} type="button" onClick={() => setForm((p) => ({ ...p, planType: pt }))}
                  className={`rounded-xl px-2 py-2.5 text-xs font-semibold border transition-all ${form.planType === pt ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {PLANS[pt].label}<span className="block text-[10px] font-normal opacity-80 mt-0.5">{formatArs(PLANS[pt].priceArs)}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating} className="bg-gray-900 text-white disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl">
              {creating ? "Creando..." : "Crear Cliente A"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-4 py-2.5 rounded-xl">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No hay clientes todavía. Creá el primero arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const dl = daysLeft(c.subscriptionEndsAt);
            const partners = c.members.filter((m) => m.clientClass === "A2");
            return (
              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold bg-blue-900 text-white px-1.5 py-0.5 rounded">A</span>
                      <span className="font-semibold text-gray-900 text-sm">{c.ownerEmail}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.membershipActive ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        {c.membershipActive ? "Membresía activa" : "Sin membresía"}
                      </span>
                    </div>
                    {c.name && <p className="text-gray-400 text-xs mt-0.5">{c.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {c.planType && PLANS[c.planType as PlanType] && (
                      <p className="text-xs font-semibold text-blue-700">{PLANS[c.planType as PlanType].label}{c.priceArs != null && ` · ${formatArs(c.priceArs)}`}</p>
                    )}
                    <p className={`text-[11px] mt-0.5 ${dl === null ? "text-gray-400" : dl <= 0 ? "text-red-500" : dl <= 7 ? "text-orange-500" : "text-gray-500"}`}>
                      {dl === null ? "Sin suscripción" : dl <= 0 ? "Vencida" : `${dl} días restantes`}
                    </p>
                    <div className="flex gap-1 mt-1 justify-end">
                      {[1, 3, 12].map((m) => (
                        <button key={m} onClick={() => extendSub(c, m)}
                          className="text-[10px] font-semibold bg-blue-900 hover:bg-blue-800 text-white px-1.5 py-0.5 rounded transition-all">
                          +{m === 12 ? "1a" : `${m}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {partners.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {partners.map((p) => (
                      <span key={p.email} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        <span className="text-[9px] font-bold bg-gray-400 text-white px-1 rounded">A2</span>{p.email}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {c.restaurants.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-wrap">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-800">{r.name}</span>
                        <span className="text-gray-400 font-mono text-[11px] ml-1.5">/{r.slug}</span>
                        {r.status === "PENDING" && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Pendiente</span>}
                        <span className="text-gray-400 text-[11px] ml-1.5">{r._count.tables}m · {r._count.orders}p</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        {r.status === "PENDING" && (
                          <button onClick={() => patchRestaurant(r.id, { status: "ACTIVE" })}
                            className="text-[11px] text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg">Habilitar</button>
                        )}
                        <a href={`/api/setup/impersonate?restaurantId=${r.id}`}
                          className="text-[11px] text-gray-600 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-lg">Ver panel</a>
                        <button onClick={() => patchRestaurant(r.id, { isActive: !r.isActive })}
                          className={`text-[11px] px-2 py-1 rounded-lg ${r.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                          {r.isActive ? "Suspender" : "Activar"}
                        </button>
                        <button onClick={() => deleteRestaurant(r)}
                          className="text-[11px] text-red-500/80 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {legacy.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Legacy (sin cliente)</p>
              {legacy.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-gray-700">{r.name} <span className="text-gray-400 font-mono text-[11px]">/{r.slug}</span></span>
                  <a href={`/api/setup/impersonate?restaurantId=${r.id}`} className="text-[11px] bg-gray-100 px-2 py-1 rounded-lg">Ver panel</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
