"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, BellRing, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";

type Entry = {
  id: string;
  name: string;
  partySize: number;
  status: string;
  position: number;
  estimatedWait: number | null;
  tableNumber: number | null;
  calledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function WaitlistPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tableInputs, setTableInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const loadedOnce = useRef(false);

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/restaurant/flow");
      if (r.ok) { const d = await r.json(); setEnabled(!!d.waitlistEnabled); }
    } catch { /* ignorar */ }
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const r = await fetch("/api/waitlist/staff");
      if (r.ok) { const d = await r.json(); setEntries(d.entries ?? []); }
    } catch { /* ignorar */ }
  }, []);

  useEffect(() => {
    loadConfig();
    loadEntries().finally(() => { loadedOnce.current = true; });
    // Polling de respaldo (el SSE da el tiempo real; esto cubre reconexiones)
    const poll = setInterval(loadEntries, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [loadConfig, loadEntries]);

  // Tiempo real: refresca al instante cuando otro dispositivo del personal
  // llama/sienta/cancela un grupo, o cuando caja prende/apaga la lista.
  const onSSE = useCallback((data: { type: string; [k: string]: unknown }) => {
    if (data.type === "WAITLIST_UPDATED") loadEntries();
    if (data.type === "WAITLIST_TOGGLE") setEnabled(!!data.enabled);
  }, [loadEntries]);
  useSSE("/api/events", onSSE);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimista
    const r = await fetch("/api/waitlist/toggle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!r.ok) setEnabled(!next); // revertir si falló
  }

  async function act(entry: Entry, action: "call" | "seat" | "cancel") {
    setBusy(entry.id);
    const raw = tableInputs[entry.id]?.trim();
    const tableNumber = raw ? parseInt(raw, 10) : undefined;
    const r = await fetch(`/api/waitlist/${entry.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, tableNumber: Number.isFinite(tableNumber) ? tableNumber : undefined }),
    });
    setBusy(null);
    if (r.ok) await loadEntries();
  }

  // No mostrar nada hasta saber el estado, salvo que haya gente esperando
  if (enabled === null && entries.length === 0) return null;

  const waiting = entries.filter((e) => e.status === "WAITING");
  const called = entries.filter((e) => e.status === "CALLED");

  return (
    <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="px-4 py-3 flex items-center justify-between bg-violet-50/60 border-b border-violet-100">
        <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-2 min-w-0">
          <Users size={16} className="text-violet-600 shrink-0" />
          <span className="font-bold text-gray-800 text-sm">Lista de espera</span>
          {waiting.length > 0 && (
            <span className="bg-violet-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
              {waiting.length} en cola
            </span>
          )}
          {collapsed ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronUp size={15} className="text-gray-400" />}
        </button>
        <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
          <span className={`text-[11px] font-semibold ${enabled ? "text-violet-700" : "text-gray-400"}`}>
            {enabled ? "Activa" : "Apagada"}
          </span>
          <input type="checkbox" checked={!!enabled} onChange={toggle} className="w-4 h-4 accent-violet-600" />
        </label>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {!enabled && entries.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-4">
              Activá la lista para que los clientes se anoten desde el QR de la puerta.
            </p>
          )}
          {enabled && entries.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-4">Nadie en espera por ahora.</p>
          )}

          <AnimatePresence>
            {/* Llamados primero (urgentes) */}
            {called.map((e) => {
              const secs = e.expiresAt ? Math.max(0, Math.ceil((new Date(e.expiresAt).getTime() - now) / 1000)) : null;
              return (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="border-2 border-amber-300 bg-amber-50/50 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BellRing size={14} className="text-amber-500 animate-bounce shrink-0" />
                      <span className="font-bold text-gray-800 text-sm truncate">{e.name}</span>
                      <span className="flex items-center gap-0.5 text-gray-400 text-xs shrink-0"><Users size={11} />{e.partySize}</span>
                    </div>
                    {secs !== null && (
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${secs <= 30 ? "text-red-500" : "text-amber-600"}`}>
                        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="numeric" placeholder="Mesa"
                      value={tableInputs[e.id] ?? (e.tableNumber ? String(e.tableNumber) : "")}
                      onChange={(ev) => setTableInputs((m) => ({ ...m, [e.id]: ev.target.value }))}
                      className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                    <button onClick={() => act(e, "seat")} disabled={busy === e.id}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                      <Check size={13} /> Sentar
                    </button>
                    <button onClick={() => act(e, "cancel")} disabled={busy === e.id}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* En cola */}
            {waiting.map((e, i) => (
              <motion.div key={e.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-semibold text-gray-800 text-sm truncate">{e.name}</span>
                    <span className="flex items-center gap-0.5 text-gray-400 text-xs shrink-0"><Users size={11} />{e.partySize}</span>
                  </div>
                  {e.estimatedWait != null && (
                    <span className="flex items-center gap-1 text-gray-400 text-[11px] shrink-0"><Clock size={11} />~{e.estimatedWait}min</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" inputMode="numeric" placeholder="Mesa"
                    value={tableInputs[e.id] ?? ""}
                    onChange={(ev) => setTableInputs((m) => ({ ...m, [e.id]: ev.target.value }))}
                    className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                  <button onClick={() => act(e, "call")} disabled={busy === e.id}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                    <BellRing size={13} /> Llamar
                  </button>
                  <button onClick={() => act(e, "cancel")} disabled={busy === e.id}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
