"use client";

import { useEffect, useState, useCallback } from "react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";

type PlanSummary = { planType: string; count: number; totalArs: number; activeCount: number };

export default function MembresiasPanel() {
  const [summary, setSummary] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/setup/clients", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const clients = d.clients ?? [];
      const map: Record<string, PlanSummary> = {};
      for (const c of clients) {
        if (!c.planType || c.clientClass === "A3") continue;
        if (!map[c.planType]) map[c.planType] = { planType: c.planType, count: 0, totalArs: 0, activeCount: 0 };
        map[c.planType].count++;
        if (c.priceArs) map[c.planType].totalArs += c.priceArs;
        if (c.membershipActive) map[c.planType].activeCount++;
      }
      setSummary(Object.values(map));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const plans = Object.entries(PLANS) as [PlanType, { label: string; months: number; priceArs: number }][];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Membresías</h1>
        <p className="text-gray-400 text-sm">Planes actuales y distribución de clientes</p>
      </div>

      {/* Planes actuales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {plans.map(([key, plan]) => {
          const s = summary.find((x) => x.planType === key);
          return (
            <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-gray-900">{plan.label}</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formatArs(plan.priceArs)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plan.months} {plan.months === 1 ? "mes" : "meses"}</p>
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

      {loading && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
        <p className="font-semibold mb-1">Edición de precios de planes</p>
        <p className="text-xs">Los precios se gestionan en <code className="bg-amber-100 px-1 rounded">src/lib/plans.ts</code>. Para editarlos globalmente desde el panel se puede agregar un modelo de configuración en la BD — disponible como próximo feature.</p>
      </div>
    </div>
  );
}
