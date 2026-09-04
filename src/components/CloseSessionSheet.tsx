"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Hoja compartida para "terminar mesa": confirmar (si está por confirmar) y cerrar
// la cuenta/sesión con datos de cobro (¿cobró?/método). La usan Mesas (dueño) y
// Mozos (staff) → un solo proceso, un solo endpoint, datos consistentes.

export type CloseTarget = { id: string; status: string; tableLabel: string; total: number };

export default function CloseSessionSheet({
  target,
  onClose,
  onDone,
}: {
  target: CloseTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [settled, setSettled] = useState<boolean | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [methodOther, setMethodOther] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>, errMsg: string) {
    if (!target) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/sessions/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) { onDone(); onClose(); }
      else { const d = await r.json().catch(() => ({})); alert(d?.error ?? errMsg); }
    } catch { alert(errMsg); }
    finally { setBusy(false); }
  }

  const chip = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
      active ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 active:bg-zinc-50"
    }`;

  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-sm shadow-2xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-8 h-1 bg-zinc-200 rounded-full" /></div>

            <div className="px-5 pt-3 pb-3 border-b border-zinc-100 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-900 text-lg truncate">{target.tableLabel}</h3>
                <p className="text-xs text-zinc-400">Total ${target.total.toLocaleString("es-AR")}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0"><X size={15} /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {target.status === "PENDING_CONFIRM" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <p className="text-xs text-amber-700 mb-2">La mesa está esperando confirmación. Confirmala para que los pedidos avancen.</p>
                  <button onClick={() => send({ action: "confirm" }, "No se pudo confirmar")} disabled={busy}
                    className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm">
                    {busy ? "…" : "Confirmar mesa"}
                  </button>
                </div>
              )}

              <p className="text-xs font-semibold text-zinc-500 pt-1">Cerrar la cuenta y la mesa</p>
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">¿Se cobró?</p>
                <div className="flex gap-2">
                  <button onClick={() => setSettled(true)} className={chip(settled === true)}>Sí</button>
                  <button onClick={() => { setSettled(false); setMethod(null); }} className={chip(settled === false)}>No</button>
                </div>
              </div>

              {settled === true && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5">Método de cobro</p>
                  <div className="flex gap-2">
                    {(["EFECTIVO", "VIRTUAL", "OTRO"] as const).map((m) => (
                      <button key={m} onClick={() => setMethod(m)} className={chip(method === m)}>
                        {m === "EFECTIVO" ? "Efectivo" : m === "VIRTUAL" ? "Virtual" : "Otro"}
                      </button>
                    ))}
                  </div>
                  {method === "OTRO" && (
                    <input value={methodOther} onChange={(e) => setMethodOther(e.target.value)} maxLength={80}
                      placeholder="¿Cuál? (ej: transferencia)"
                      className="mt-2 w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300" />
                  )}
                </div>
              )}

              <button
                onClick={() => send({ action: "close", settled, method: settled ? method ?? undefined : undefined, methodOther: method === "OTRO" ? methodOther : undefined }, "No se pudo cerrar la mesa")}
                disabled={busy || settled === null || (settled === true && !method)}
                className="w-full bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm">
                {busy ? "Cerrando…" : "Cerrar mesa"}
              </button>
              <button onClick={() => send({ action: "close" }, "No se pudo cerrar la mesa")} disabled={busy}
                className="w-full text-zinc-500 active:text-zinc-700 font-medium py-1.5 text-xs">
                Cerrar sin completar datos
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
