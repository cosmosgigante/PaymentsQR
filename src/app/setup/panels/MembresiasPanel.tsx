"use client";

import { useEffect, useState, useCallback } from "react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";
import { Clock, CheckCircle } from "lucide-react";

type PlanSummary = { planType: string; count: number; totalArs: number; activeCount: number };
type PendingClient = { email: string; accountId: string | null; accountName: string | null; pendingPlanType: string };

export default function MembresiasPanel({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [summary, setSummary] = useState<PlanSummary[]>([]);
  const [pending, setPending] = useState<PendingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/setup/clients", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const clients = d.clients ?? [];

      // Solicitudes pendientes de aprobación
      const pend: PendingClient[] = clients
        .filter((c: { pendingPlanType: string | null }) => !!c.pendingPlanType)
        .map((c: { email: string; accountId: string | null; accountName: string | null; pendingPlanType: string }) => ({
          email: c.email, accountId: c.accountId, accountName: c.accountName, pendingPlanType: c.pendingPlanType,
        }));
      setPending(pend);
      onPendingCount?.(pend.length);

      // Resumen por plan
      const map: Record<string, PlanSummary> = {};
      for (const c of clients) {
        if (!c.planType || c.clientClass === "A4") continue;
        if (!map[c.planType]) map[c.planType] = { planType: c.planType, count: 0, totalArs: 0, activeCount: 0 };
        map[c.planType].count++;
        if (c.priceArs) map[c.planType].totalArs += c.priceArs;
        if (c.membershipActive) map[c.planType].activeCount++;
      }
      setSummary(Object.values(map));
    }
    setLoading(false);
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  async function approve(client: PendingClient) {
    setApproving(client.email);
    const r = await fetch(`/api/setup/clients/${encodeURIComponent(client.email)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_membership", planType: client.pendingPlanType }),
    });
    setApproving(null);
    if (r.ok) {
      setMsg(`Membresía de ${client.email} activada ✓`);
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
          <p className="text-gray-400 text-sm">Solicitudes pendientes y distribución de planes activos</p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">Actualizar</button>
      </div>

      {msg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">{msg}</p>}

      {/* Solicitudes pendientes */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Pendientes de aprobación</h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.email} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{c.email}</p>
                  {c.accountName && <p className="text-gray-500 text-xs">{c.accountName}</p>}
                  <p className="text-amber-700 text-xs font-semibold mt-0.5">
                    Solicitó: {PLANS[c.pendingPlanType as PlanType]?.label ?? c.pendingPlanType}
                    {" · "}{formatArs(PLANS[c.pendingPlanType as PlanType]?.priceArs ?? 0)}
                  </p>
                </div>
                <button
                  onClick={() => approve(c)}
                  disabled={approving === c.email}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
                >
                  <CheckCircle size={14} />
                  {approving === c.email ? "Aprobando..." : "Aprobar membresía"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && !pending.length && (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      )}

      {/* Resumen de planes activos */}
      {!loading && (
        <>
          <h2 className="font-semibold text-gray-800 mb-3">Planes activos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {plans.map(([key, plan]) => {
              const s = summary.find((x) => x.planType === key);
              return (
                <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="font-bold text-gray-900">{plan.label}</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{formatArs(plan.priceArs)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.months === 1 ? "por mes" : `por ${plan.months} meses`}</p>
                  {s ? (
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Clientes</span><span className="font-semibold">{s.count}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Activos</span><span className="font-semibold text-emerald-600">{s.activeCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">MRR aprox.</span><span className="font-semibold text-blue-700">{formatArs(s.activeCount * plan.priceArs)}</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-3">Sin clientes</p>
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
