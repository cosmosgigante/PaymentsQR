"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Search, Plus, X } from "lucide-react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";

type RestaurantLite = { id: string; name: string; slug: string; isActive: boolean; status: string; _count: { tables: number; orders: number } };
type Member = { email: string; role: string; accessScope: string | null };
type SocietyMembership = { accountId: string; accountName: string | null; role: "A" | "A2"; membershipActive: boolean };
type Client = {
  email: string; clientClass: "A" | "A2" | "A3" | "A4";
  accountId: string | null; accountName: string | null; ownerEmail: string | null; isOwner: boolean;
  planType: string | null; priceArs: number | null; subscriptionEndsAt: string | null;
  isActive: boolean; membershipActive: boolean; daysLeft: number | null; canceledAt: string | null;
  members: Member[]; restaurants: RestaurantLite[];
  societyMemberships: SocietyMembership[];
};

const CLASS_BADGE: Record<string, string> = {
  A:  "bg-blue-900 text-white",
  A2: "bg-blue-100 text-blue-800",
  A3: "bg-purple-100 text-purple-800",
  A4: "bg-gray-200 text-gray-600",
};

function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/setup/clients", { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setClients(d.clients ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { clients, loading, reload: load };
}

// ──────────────────────────────
// Vista de detalle de un cliente
// ──────────────────────────────
function ClientDetail({ client, onBack, onReload, accounts }: { client: Client; onBack: () => void; onReload: () => void; accounts: Client[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showRestForm, setShowRestForm] = useState(false);
  const [showMembershipForm, setShowMembershipForm] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [restForm, setRestForm] = useState({ name: "", slug: "" });
  const [memberForm, setMemberForm] = useState({ planType: "MENSUAL" as PlanType, months: 0 });
  const [upgradeForm, setUpgradeForm] = useState({ restaurantName: "", slug: "", planType: "MENSUAL" as PlanType });

  const handleRest = (n: string) => setRestForm((p) => ({ ...p, name: n, slug: n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/setup/clients/${encodeURIComponent(client.email)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const d = await r.json();
    setMsg({ text: r.ok ? "Guardado ✓" : (d.error ?? "Error"), ok: r.ok });
    setBusy(false);
    if (r.ok) { onReload(); setShowRestForm(false); setShowMembershipForm(false); setShowUpgradeForm(false); }
  }

  const c = client;
  const dl = c.daysLeft;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-5">
        <ArrowLeft size={15} /> Volver a clientes
      </button>

      {/* Cabecera */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CLASS_BADGE[c.clientClass]}`}>{c.clientClass}</span>
              <h2 className="font-bold text-gray-900">{c.email}</h2>
            </div>
            {c.accountName && <p className="text-gray-400 text-sm">{c.accountName}</p>}
            {!c.isOwner && c.ownerEmail && <p className="text-gray-400 text-xs">Socio de {c.ownerEmail}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {c.accountId && (
              <>
                <a href={`/api/setup/impersonate?accountId=${c.accountId}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-all">
                  Ingresar en cuenta
                </a>
                <button onClick={() => call("toggle_active", { isActive: !c.isActive })} disabled={busy}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${c.isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                  {c.isActive ? "Suspender" : "Activar"}
                </button>
              </>
            )}
          </div>
        </div>
        {msg && <p className={`text-sm mt-3 ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>}
      </div>

      {/* Membresía */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Membresía</h3>
          {c.clientClass !== "A3" && (
            <button onClick={() => setShowMembershipForm((v) => !v)} className="text-xs text-blue-700 font-semibold">Intervenir</button>
          )}
        </div>
        {c.clientClass === "A4" ? (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Sin membresía ni sociedad — cliente A4</p>
            <button onClick={() => setShowUpgradeForm((v) => !v)} className="text-xs font-semibold bg-blue-900 text-white px-3 py-1.5 rounded-xl hover:bg-blue-800">
              Promover a A
            </button>
          </div>
        ) : c.clientClass === "A3" ? (
          <div>
            <p className="text-gray-500 text-sm mb-2">Está en múltiples sociedades con roles distintos:</p>
            <div className="space-y-1.5">
              {c.societyMemberships.map((s) => (
                <div key={s.accountId} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm text-gray-700">{s.accountName ?? s.accountId}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CLASS_BADGE[s.role]}`}>{s.role}</span>
                    <span className={`text-[11px] font-semibold ${s.membershipActive ? "text-emerald-600" : "text-red-400"}`}>{s.membershipActive ? "activa" : "inactiva"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : c.accountId ? (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold">{c.planType && PLANS[c.planType as PlanType] ? PLANS[c.planType as PlanType].label : "–"}{c.priceArs != null && ` · ${formatArs(c.priceArs)}`}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado</span>
              <span className={c.membershipActive ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{c.membershipActive ? "Activa" : "Inactiva/vencida"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vence</span>
              <span className={dl !== null && dl <= 7 ? "text-orange-500" : "text-gray-700"}>
                {c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt).toLocaleDateString("es-AR") : "–"}
                {dl !== null && ` (${dl} días)`}
              </span>
            </div>
            {c.canceledAt && <div className="flex justify-between text-sm"><span className="text-gray-500">Cancelado</span><span className="text-red-500">{new Date(c.canceledAt).toLocaleDateString("es-AR")}</span></div>}
          </div>
        ) : null}

        {showUpgradeForm && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Crear cuenta + primer restorán</p>
            <input placeholder="Nombre del restorán" value={upgradeForm.restaurantName}
              onChange={(e) => { const n = e.target.value; setUpgradeForm((p) => ({ ...p, restaurantName: n, slug: n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <input placeholder="slug-url" value={upgradeForm.slug}
              onChange={(e) => setUpgradeForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                <button key={pt} type="button" onClick={() => setUpgradeForm((p) => ({ ...p, planType: pt }))}
                  className={`rounded-xl py-2 text-xs font-semibold border transition-all ${upgradeForm.planType === pt ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {PLANS[pt].label}
                </button>
              ))}
            </div>
            <button disabled={busy || !upgradeForm.restaurantName || !upgradeForm.slug}
              onClick={() => call("upgrade_to_A", { restaurantName: upgradeForm.restaurantName, slug: upgradeForm.slug, planType: upgradeForm.planType })}
              className="bg-blue-900 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
              {busy ? "..." : "Promover a A"}
            </button>
          </div>
        )}

        {showMembershipForm && c.accountId && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Cambiar plan</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                <button key={pt} type="button" onClick={() => setMemberForm((p) => ({ ...p, planType: pt }))}
                  className={`rounded-xl py-2 text-xs font-semibold border transition-all ${memberForm.planType === pt ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {PLANS[pt].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => call("set_membership", { planType: memberForm.planType })}
                className="flex-1 bg-blue-900 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50">Aplicar plan</button>
              <button disabled={busy} onClick={() => call("cancel_membership")}
                className="flex-1 border border-red-200 text-red-500 text-sm font-semibold py-2 rounded-xl hover:bg-red-50 disabled:opacity-50">Cancelar membresía</button>
            </div>
            <p className="text-xs text-gray-400">Extender desde hoy:</p>
            <div className="flex gap-1.5">
              {[1, 3, 6, 12].map((m) => (
                <button key={m} disabled={busy} onClick={() => call("set_membership", { months: m })}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg">+{m === 12 ? "1a" : `${m}m`}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restoranes */}
      {(c.clientClass === "A" || c.clientClass === "A2") && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Restoranes ({c.restaurants.length})</h3>
            {c.accountId && (
              <button onClick={() => setShowRestForm((v) => !v)} className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                <Plus size={12} />Agregar
              </button>
            )}
          </div>
          {c.restaurants.length === 0 && (
            <p className="text-gray-400 text-sm">Sin restoranes. La membresía está activa pero no se creó ninguno. Usá "Agregar" para solucionarlo.</p>
          )}
          <div className="space-y-1.5">
            {c.restaurants.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-wrap">
                <div>
                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  <span className="text-gray-400 font-mono text-[11px] ml-1.5">/{r.slug}</span>
                  {r.status === "PENDING" && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Pendiente</span>}
                  <span className="text-gray-400 text-[11px] ml-1.5">{r._count.tables}m · {r._count.orders}p</span>
                </div>
                <a href={`/api/setup/impersonate?restaurantId=${r.id}`} className="text-[11px] text-gray-600 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-lg">Ver panel</a>
              </div>
            ))}
          </div>
          {showRestForm && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              <input placeholder="Nombre del restorán" value={restForm.name} onChange={(e) => handleRest(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              <input placeholder="slug-url" value={restForm.slug} onChange={(e) => setRestForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none" />
              <div className="flex gap-2">
                <button disabled={busy || !restForm.name || !restForm.slug}
                  onClick={() => call("create_restaurant", { restaurantName: restForm.name, slug: restForm.slug })}
                  className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">{busy ? "..." : "Crear restorán"}</button>
                <button onClick={() => setShowRestForm(false)} className="text-gray-500 text-sm px-4 py-2 rounded-xl"><X size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Socios de la cuenta */}
      {c.members.length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Socios de la cuenta</h3>
          {c.members.filter((m) => m.email !== c.ownerEmail).map((m) => (
            <div key={m.email} className="flex items-center gap-2 text-sm py-1.5">
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">A2</span>
              <span className="text-gray-700">{m.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────
// Panel principal: listado
// ──────────────────────────────
export default function ClientesPanel() {
  const { clients, loading, reload } = useClients();
  const [filter, setFilter] = useState<"ALL" | "A" | "A2" | "A3" | "A4">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<"A" | "A2" | "A3">("A3");
  const [form, setForm] = useState({ email: "", restaurantName: "", slug: "", planType: "MENSUAL" as PlanType, accountId: "" });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = filter === "ALL" ? clients : clients.filter((c: Client) => c.clientClass === filter);
    if (search.trim()) list = list.filter((c) => c.email.includes(search.toLowerCase()) || (c.accountName ?? "").toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [clients, filter, search]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true); setError(null);
    const body: Record<string, unknown> = { type: newType, email: form.email };
    if (newType === "A")  { body.restaurantName = form.restaurantName; body.slug = form.slug; body.planType = form.planType; }
    if (newType === "A2") body.accountId = form.accountId;
    const r = await fetch("/api/setup/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setCreating(false);
    if (!r.ok) { setError(d.error ?? "Error"); return; }
    setShowForm(false);
    setMsg(`Cliente ${newType} ${form.email} creado ✓`);
    setForm({ email: "", restaurantName: "", slug: "", planType: "MENSUAL", accountId: "" });
    setTimeout(() => setMsg(null), 5000);
    reload();
  }

  if (selected) {
    return <ClientDetail client={selected} onBack={() => setSelected(null)} onReload={() => { reload(); setSelected(null); }} accounts={clients} />;
  }

  const counts = { A: clients.filter((c: Client) => c.clientClass === "A").length, A2: clients.filter((c: Client) => c.clientClass === "A2").length, A3: clients.filter((c: Client) => c.clientClass === "A3").length, A4: clients.filter((c: Client) => c.clientClass === "A4").length };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-400 text-sm">{clients.length} perfiles · {counts.A}A · {counts.A2}A2 · {counts.A3}A3 · {counts.A4}A4</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setError(null); }} className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
          <Plus size={14} />Nuevo cliente
        </button>
      </div>

      {msg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">{msg}</p>}

      {showForm && (
        <form onSubmit={create} className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm space-y-3">
          <div className="flex gap-2 mb-2">
            {(["A3", "A2", "A"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setNewType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${newType === t ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500"}`}>
                {t === "A" ? "A (nuevo cliente)" : t === "A2" ? "A2 (socio existente)" : "A3 (perfil sin membresía)"}
              </button>
            ))}
          </div>
          <input type="email" required placeholder="Gmail del cliente" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          {newType === "A" && (
            <>
              <input required placeholder="Nombre del negocio / restorán" value={form.restaurantName} onChange={(e) => { const n = e.target.value; setForm((p) => ({ ...p, restaurantName: n, slug: n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
              <input required placeholder="slug-url" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" />
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                  <button key={pt} type="button" onClick={() => setForm((p) => ({ ...p, planType: pt }))}
                    className={`rounded-xl py-2 text-xs font-semibold border transition-all ${form.planType === pt ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {PLANS[pt].label}
                  </button>
                ))}
              </div>
            </>
          )}
          {newType === "A2" && (
            <select required value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="">— Elegir cuenta —</option>
              {clients.filter((c) => c.accountId && c.isOwner).map((c) => (
                <option key={c.accountId!} value={c.accountId!}>{c.email} ({c.accountName ?? "sin nombre"})</option>
              ))}
            </select>
          )}
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">{creating ? "..." : "Crear"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-4 py-2.5 rounded-xl">Cancelar</button>
          </div>
        </form>
      )}

      {/* Búsqueda + filtro */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Buscar por email o nombre..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        {(["ALL", "A", "A2", "A3", "A4"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"}`}>
            {f === "ALL" ? "Todos" : f}{f !== "ALL" && ` (${counts[f as "A" | "A2" | "A3" | "A4"]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center"><p className="text-gray-400 text-sm">Sin resultados.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button key={c.email} onClick={() => setSelected(c)}
              className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-gray-300 hover:shadow transition-all group">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${CLASS_BADGE[c.clientClass]}`}>{c.clientClass}</span>
                  <span className="font-medium text-gray-900 truncate text-sm">{c.email}</span>
                  {c.accountName && <span className="text-gray-400 text-xs truncate hidden sm:block">{c.accountName}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${c.membershipActive ? "text-emerald-600" : c.clientClass === "A4" ? "text-gray-400" : c.clientClass === "A3" ? "text-purple-600" : "text-red-500"}`}>
                    {c.clientClass === "A4" ? "Sin membresía" : c.clientClass === "A3" ? `Multi-sociedad (${c.societyMemberships.length})` : c.membershipActive ? `${c.daysLeft}d` : "Vencida"}
                  </span>
                  {c.restaurants.length === 0 && c.accountId && (
                    <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full">Sin restorán</span>
                  )}
                  <span className="text-gray-300 group-hover:text-gray-500 text-lg leading-none">›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
