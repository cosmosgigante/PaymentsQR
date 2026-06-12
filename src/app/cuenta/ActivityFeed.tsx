"use client";

import { useState, useEffect, useCallback } from "react";
import { ACTION_LABELS, CATEGORY_LABELS } from "@/lib/activityLabels";
import type { Restaurant } from "./CuentaClient";

type Log = {
  id: string;
  restaurantId: string | null;
  actorType: string;
  actorName: string | null;
  category: string;
  action: string;
  detail: string | null;
  createdAt: string;
};

const SUBTABS: { key: string; label: string; category: string | null }[] = [
  { key: "completa", label: "Actividad completa", category: null },
  { key: "personal", label: "Personal", category: "PERSONAL" },
  { key: "pedidos",  label: "Pedidos",  category: "PEDIDOS" },
];

const ACTOR_BADGE: Record<string, { label: string; cls: string }> = {
  OWNER:      { label: "Admin",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  STAFF:      { label: "Personal",   cls: "bg-violet-50 text-violet-700 border-violet-200" },
  SUPERADMIN: { label: "Soporte",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
  SYSTEM:     { label: "Sistema",    cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function ActivityFeed({ restaurants }: { restaurants: Restaurant[] }) {
  const [sub, setSub] = useState("completa");
  const [restFilter, setRestFilter] = useState("all");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const restName = (id: string | null) => (id ? restaurants.find((r) => r.id === id)?.name ?? "—" : "Cuenta");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const cat = SUBTABS.find((s) => s.key === sub)?.category;
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (restFilter !== "all") params.set("restaurantId", restFilter);
    const res = await fetch(`/api/account/activity?${params.toString()}`, { cache: "no-store" });
    if (res.ok) setLogs((await res.json()).logs);
    setLoading(false);
  }, [sub, restFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function fmt(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <div className="space-y-4">
      {/* Sub-pestañas */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
        {SUBTABS.map((s) => (
          <button key={s.key} onClick={() => setSub(s.key)}
            className={`flex-1 text-xs sm:text-sm font-semibold px-2 py-2 rounded-xl transition-all ${
              sub === s.key ? "bg-blue-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filtro por restorán */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Restorán:</span>
        <select value={restFilter} onChange={(e) => setRestFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">Todos</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Feed */}
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-6">Cargando…</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-gray-500 text-sm font-medium">Sin actividad todavía</p>
          <p className="text-gray-300 text-xs mt-1">Las acciones del personal y la cuenta van a aparecer acá.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {logs.map((l) => {
            const badge = ACTOR_BADGE[l.actorType] ?? ACTOR_BADGE.SYSTEM;
            return (
              <div key={l.id} className="px-4 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{l.actorName ?? "—"}</span>
                    <span className="text-[11px] text-gray-400">· {CATEGORY_LABELS[l.category] ?? l.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {ACTION_LABELS[l.action] ?? l.action}{l.detail ? ` — ${l.detail}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{restName(l.restaurantId)}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 font-mono whitespace-nowrap">{fmt(l.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
