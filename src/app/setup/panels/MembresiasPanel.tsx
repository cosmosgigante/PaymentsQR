"use client";

import { useEffect, useState, useCallback } from "react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";
import { Clock, CheckCircle, Building2 } from "lucide-react";

type PendingOrg = {
  id: string; name: string | null; ownerEmail: string;
  pendingPlanType: string; isActive: boolean;
  subscriptionEndsAt: string | null;
  _count: { restaurants: number };
};

type PlanSummary = { planType: string; count: number; activeCount: number };

export default function MembresiasPanel({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [pending, setPending] = useState<PendingOrg[]>([]);
  const [summary, setSummary] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pendRes, clientsRes] = await Promise.all([
      fetch("/api/setup/memberships", { cache: "no-store" }),
      fetch("/api/setup/clients", { cache: "no-store" }),
    ]);

    if (pendRes.ok) {
      const d = await pendRes.json();
      const p = d.pending ?? [];
      setPending(p);
      onPendingCount?.(p.length);
    }

    if (clientsRes.ok) {
      const d = await clientsRes.json();
      const map: Record<string, PlanSummary> = {};
      for (const c of (d.clients ?? [])) {
        if (!c.planType) continue;
        if (!map[c.planType]) map[c.planType] = { planType: c.planType, count: 0, activeCount: 0 };
        map[c.planType].count++;
        if (c.membershipActive) map[c.planType].activeCount++;
      }
      setSummary(Object.values(map));
    }
    setLoading(false);
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  async function approve(org: PendingOrg) {
    setApproving(org.id);
    const r = await fetch("/api/setup/memberships", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id }),
    });
    setApproving(null);
    if (r.ok) {
      setMsg(`Membresía de "${org.name ?? org.ownerEmail}" activada ✓`);
      setTimeout(() => setMsg(null), 5000);
      load();
    }
  }

  const plans = Object.entries(PLANS) as [PlanType, { label: string; months: number; priceArs: number }][];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Membresías</h1>
          <p className="text-gray-400 text-sm">Membresía por organización — no por perfil de usuario</p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">Actualizar</button>
      </div>

      {msg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">{msg}</p>}

      {/* Orgs con solicitud pendiente */}
      {!loading && pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Solicitudes pendientes de aprobación</h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="space-y-2">
            {pending.map((org) => (
              <div key={org.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{org.name ?? "Sin nombre"}</p>
                    <p className="text-gray-500 text-xs truncate">{org.ownerEmail} · {org._count.restaurants} restorán{org._count.restaurants !== 1 ? "es" : ""}</p>
                    <p className="text-amber-700 text-xs font-semibold mt-0.5">
                      Plan solicitado: {PLANS[org.pendingPlanType as PlanType]?.label ?? org.pendingPlanType}
                      {" · "}{formatArs(PLANS[org.pendingPlanType as PlanType]?.priceArs ?? 0)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => approve(org)}
                  disabled={approving === org.id}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shrink-0"
                >
                  <CheckCircle size={14} />
                  {approving === org.id ? "Aprobando..." : "Activar membresía"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      )}

      {/* Distribución por plan */}
      {!loading && (
        <>
          <h2 className="font-semibold text-gray-800 mb-3">Distribución por plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map(([key, plan]) => {
              const s = summary.find((x) => x.planType === key);
              return (
                <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="font-bold text-gray-900">{plan.label}</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{formatArs(plan.priceArs)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.months === 1 ? "por mes · por org" : `${plan.months} meses · por org`}</p>
                  {s ? (
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Orgs</span><span className="font-semibold">{s.count}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Activas</span><span className="font-semibold text-emerald-600">{s.activeCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">MRR aprox.</span><span className="font-semibold text-blue-700">{formatArs(s.activeCount * plan.priceArs)}</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-3">Sin organizaciones</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
