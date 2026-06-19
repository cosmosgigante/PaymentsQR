"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";

type Participant = { email: string; isOwner: boolean; isPayingOwner: boolean; accessScope: string | null; source: string };
type Restaurant = { id: string; name: string; slug: string; status: string; isActive: boolean };
type Org = {
  id: string; name: string | null; ownerEmail: string;
  planType: string | null; priceArs: number | null;
  membershipActive: boolean; daysLeft: number | null; isActive: boolean;
  pendingPlanType: string | null; canceledAt: string | null;
  participants: Participant[]; restaurants: Restaurant[];
};

function StatusBadge({ org }: { org: Org }) {
  if (org.membershipActive)
    return <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Activa · {org.daysLeft}d</span>;
  if (org.pendingPlanType)
    return <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>;
  if (org.canceledAt)
    return <span className="text-[11px] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Cancelada</span>;
  return <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">Sin membresía</span>;
}

function OrgCard({ org, onEnter }: { org: Org; onEnter: (restaurantId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">{org.name ?? "Sin nombre"}</span>
              <StatusBadge org={org} />
            </div>
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              {org.ownerEmail}
              {org.planType && PLANS[org.planType as PlanType] && ` · ${PLANS[org.planType as PlanType].label}`}
              {org.priceArs != null && ` · ${formatArs(org.priceArs)}`}
              {` · ${org.restaurants.length} restorán${org.restaurants.length !== 1 ? "es" : ""}`}
              {` · ${org.participants.length} participante${org.participants.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          {/* Participantes */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Participantes</p>
            <div className="space-y-1">
              {org.participants.map((p) => (
                <div key={p.email} className="flex items-center gap-2 text-sm">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${p.isPayingOwner ? "bg-blue-900 text-white" : "bg-blue-100 text-blue-800"}`}>
                    {p.isPayingOwner ? "A" : "A2"}
                  </span>
                  <span className="text-gray-700 truncate">{p.email}</span>
                  {p.isOwner && <span className="text-[10px] text-gray-400">dueño</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Restoranes */}
          {org.restaurants.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Restoranes</p>
              <div className="space-y-1">
                {org.restaurants.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700">{r.name} <span className="text-gray-400 font-mono text-[11px]">/{r.slug}</span></span>
                    <a href={`/api/setup/impersonate?restaurantId=${r.id}`}
                      className="text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg shrink-0">Ver panel</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingresar a cuenta */}
          <div className="pt-1">
            <a href={`/api/setup/impersonate?accountId=${org.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all">
              Ingresar en esta org
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizacionesPanel() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", ownerEmail: "", planType: "" as PlanType | "",
    restaurantName: "", slug: "",
    partners: [] as { email: string; isPayingOwner: boolean }[],
  });
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPaying, setPartnerPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/setup/orgs", { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setOrgs(d.orgs ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    return !q || (o.name ?? "").toLowerCase().includes(q) || o.ownerEmail.includes(q)
      || o.participants.some((p) => p.email.includes(q));
  });

  function addPartner() {
    const e = partnerEmail.trim().toLowerCase();
    if (!e || form.partners.find((p) => p.email === e)) return;
    setForm((f) => ({ ...f, partners: [...f.partners, { email: e, isPayingOwner: partnerPaying }] }));
    setPartnerEmail(""); setPartnerPaying(false);
  }

  function removePartner(email: string) {
    setForm((f) => ({ ...f, partners: f.partners.filter((p) => p.email !== email) }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true); setCreateError(null);
    const r = await fetch("/api/setup/orgs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, ownerEmail: form.ownerEmail,
        planType: form.planType || undefined,
        restaurantName: form.restaurantName || undefined,
        slug: form.slug || undefined,
        partners: form.partners,
      }),
    });
    const d = await r.json();
    setCreating(false);
    if (!r.ok) { setCreateError(d.error ?? "Error"); return; }
    setShowCreate(false);
    setMsg(`Organización "${form.name}" creada ✓`);
    setForm({ name: "", ownerEmail: "", planType: "", restaurantName: "", slug: "", partners: [] });
    setTimeout(() => setMsg(null), 5000);
    load();
  }

  const active = orgs.filter((o) => o.membershipActive).length;
  const pending = orgs.filter((o) => o.pendingPlanType).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organizaciones</h1>
          <p className="text-gray-400 text-sm">{orgs.length} total · {active} activas · {pending > 0 ? `${pending} pendientes` : "sin pendientes"}</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
          <Plus size={14} />Nueva org
        </button>
      </div>

      {msg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">{msg}</p>}

      {/* Formulario crear org */}
      {showCreate && (
        <form onSubmit={create} className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-800">Nueva organización</h3>
          <input required placeholder="Nombre de la organización" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          <input required type="email" placeholder="Gmail del dueño (responsable)" value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />

          {/* Activar membresía directo (opcional) */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Membresía (opcional — se puede activar después)</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => setForm((f) => ({ ...f, planType: "" }))}
                className={`text-xs font-semibold py-2 rounded-xl border transition-all ${!form.planType ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500"}`}>
                Sin plan
              </button>
              {(Object.keys(PLANS) as PlanType[]).map((pt) => (
                <button key={pt} type="button" onClick={() => setForm((f) => ({ ...f, planType: pt }))}
                  className={`text-xs font-semibold py-2 rounded-xl border transition-all ${form.planType === pt ? "bg-blue-900 text-white border-blue-900" : "border-gray-200 text-gray-500"}`}>
                  {PLANS[pt].label}
                </button>
              ))}
            </div>
          </div>

          {/* Primer restorán (opcional) */}
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nombre del restorán (opcional)" value={form.restaurantName}
              onChange={(e) => { const n = e.target.value; setForm((f) => ({ ...f, restaurantName: n, slug: n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })); }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            <input placeholder="slug-url" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" />
          </div>

          {/* Socios */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Socios (opcional)</p>
            <div className="flex gap-2 mb-2">
              <input type="email" placeholder="Gmail del socio" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              <button type="button" onClick={() => setPartnerPaying((v) => !v)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all shrink-0 ${partnerPaying ? "bg-blue-900 text-white border-blue-900" : "border-gray-200 text-gray-500"}`}>
                {partnerPaying ? "Co-paga" : "No paga"}
              </button>
              <button type="button" onClick={addPartner} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-xl text-sm shrink-0">
                <Plus size={14} />
              </button>
            </div>
            {form.partners.map((p) => (
              <div key={p.email} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 mb-1">
                <span className={`font-bold px-1 rounded ${p.isPayingOwner ? "bg-blue-900 text-white" : "bg-gray-200 text-gray-600"}`}>{p.isPayingOwner ? "co-paga" : "A2"}</span>
                <span className="flex-1">{p.email}</span>
                <button type="button" onClick={() => removePartner(p.email)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            ))}
          </div>

          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-gray-900 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50">{creating ? "Creando..." : "Crear organización"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 text-sm px-4 py-2.5 rounded-xl">Cancelar</button>
          </div>
        </form>
      )}

      {/* Buscador */}
      <input placeholder="Buscar por nombre, dueño o participante..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-4" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center"><p className="text-gray-400 text-sm">Sin resultados.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((org) => <OrgCard key={org.id} org={org} onEnter={() => {}} />)}
        </div>
      )}
    </div>
  );
}
