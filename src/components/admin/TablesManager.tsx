"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, QrCode, Power, Trash2, ArrowLeft, Download, X, DoorOpen, ShoppingBag, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { ORDER_STATUS_LABELS, OrderStatus } from "@/lib/types";
import type { LiveTablesMap } from "@/lib/tableSession";

type Table = {
  id: string;
  number: number;
  label: string | null;
  qrToken: string;
  isActive: boolean;
};

// "Hace X" legible a partir de un ISO.
function sinceLabel(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${min % 60} min`;
}

export default function TablesManager({
  initialTables,
  restaurantSlug,
  initialLive = {},
}: {
  initialTables: Table[];
  restaurantSlug: string;
  initialLive?: LiveTablesMap;
}) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [live, setLive] = useState<LiveTablesMap>(initialLive);
  const [detailTable, setDetailTable] = useState<Table | null>(null);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedQr, setSelectedQr] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showDoorQr, setShowDoorQr] = useState(false);
  const [doorQrUrl, setDoorQrUrl] = useState("");

  // Poll del estado en vivo de las mesas (ocupada/libre + rondas + total).
  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch("/api/tables/live");
      if (r.ok) setLive(await r.json());
    } catch { /* sin conexión: mantenemos lo último */ }
  }, []);

  useEffect(() => {
    const poll = setInterval(refreshLive, 6000);
    return () => clearInterval(poll);
  }, [refreshLive]);

  // ── Cierre de cuenta/sesión desde el detalle de la mesa ──
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [settled, setSettled] = useState<boolean | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [methodOther, setMethodOther] = useState("");
  const [closing, setClosing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Confirmar la mesa (sale de PENDING_CONFIRM → OPEN). Antes esto no tenía UI en
  // ningún lado → el comensal quedaba atrapado en "esperando confirmación".
  async function confirmSession(sessionId: string) {
    setConfirming(true);
    try {
      const r = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (r.ok) { setDetailTable(null); refreshLive(); }
      else { const d = await r.json().catch(() => ({})); alert(d?.error ?? "No se pudo confirmar la mesa"); }
    } catch { alert("No se pudo confirmar la mesa"); }
    finally { setConfirming(false); }
  }

  // Reset del formulario cada vez que se abre/cambia el detalle de una mesa.
  useEffect(() => {
    setShowCloseForm(false); setSettled(null); setMethod(null); setMethodOther("");
  }, [detailTable]);

  async function closeSession(sessionId: string, withData: boolean) {
    setClosing(true);
    try {
      const payload = withData
        ? { action: "close", settled, method: settled ? method ?? undefined : undefined, methodOther: method === "OTRO" ? methodOther : undefined }
        : { action: "close" };
      const r = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) { setDetailTable(null); refreshLive(); }
      else { const d = await r.json().catch(() => ({})); alert(d?.error ?? "No se pudo cerrar la mesa"); }
    } catch { alert("No se pudo cerrar la mesa"); }
    finally { setClosing(false); }
  }

  const chipCls = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
      active ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 active:bg-zinc-50"
    }`;

  useEffect(() => {
    if (!selectedQr) { setQrDataUrl(""); return; }
    const url = `${window.location.origin}/mesa/${selectedQr.qrToken}`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [selectedQr]);

  useEffect(() => {
    if (!showDoorQr || !restaurantSlug) { setDoorQrUrl(""); return; }
    const url = `${window.location.origin}/esperar/${restaurantSlug}`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#5b21b6", light: "#ffffff" },
    }).then(setDoorQrUrl);
  }, [showDoorQr, restaurantSlug]);

  function downloadDoorQr() {
    if (!doorQrUrl) return;
    const a = document.createElement("a");
    a.href = doorQrUrl;
    a.download = `qr-puerta-${restaurantSlug}.png`;
    a.click();
  }

  async function createTable() {
    if (!newNumber) return;
    setSaving(true);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: parseInt(newNumber), label: newLabel || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setTables((prev) => [...prev, data].sort((a, b) => a.number - b.number));
      setNewNumber("");
      setNewLabel("");
    } else {
      alert(data.error);
    }
    setSaving(false);
  }

  async function toggleActive(table: Table) {
    const res = await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    const updated = await res.json();
    if (res.ok) setTables((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  async function deleteTable(table: Table) {
    if (!confirm(`¿Eliminar ${table.label ?? `Mesa ${table.number}`}?`)) return;
    const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
    if (res.ok) setTables((prev) => prev.filter((t) => t.id !== table.id));
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedQr) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-mesa-${selectedQr.number}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen-dvh bg-slate-100">
      {/* Hero header — mismo estilo que panel admin */}
      <div
        className="relative overflow-hidden px-4 sm:px-5 pb-6"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        </div>
        <div className="relative max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/admin"
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <h1 className="font-bold text-white text-lg">Mesas y QR</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-3">
        {/* QR de puerta — lista de espera */}
        <button
          onClick={() => setShowDoorQr(true)}
          className="w-full bg-violet-50 border border-violet-100 rounded-2xl p-4 flex items-center gap-3 text-left active:bg-violet-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0">
            <DoorOpen size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-zinc-900 text-[15px] leading-snug">QR de puerta · Lista de espera</p>
            <p className="text-xs text-zinc-500 mt-0.5">Pegalo en la entrada para que los clientes se anoten en la fila.</p>
          </div>
          <QrCode size={17} className="text-violet-400 shrink-0" />
        </button>

        {/* Crear mesa */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Nueva mesa
          </p>
          <div className="flex gap-2">
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="N°"
              type="number"
              min="1"
              inputMode="numeric"
              className="w-16 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 text-center min-h-[48px]"
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nombre (ej: Terraza 1)"
              className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
            />
            <button
              onClick={createTable}
              disabled={saving || !newNumber}
              className="bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 min-h-[48px]"
            >
              <Plus size={15} strokeWidth={2.5} />
              Crear
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {tables.map((table, i) => {
            const st = live[table.id];
            const occupied = table.isActive && !!st;
            return (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-3 min-h-[72px] ${
                !table.isActive ? "opacity-60 border-zinc-100"
                : occupied ? "border-emerald-200" : "border-zinc-100"
              }`}
            >
              <button
                type="button"
                disabled={!occupied}
                onClick={() => occupied && setDetailTable(table)}
                className="flex-1 min-w-0 text-left disabled:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    !table.isActive ? "bg-zinc-300"
                    : occupied ? (st.status === "PENDING_CONFIRM" ? "bg-amber-400" : "bg-emerald-500")
                    : "bg-zinc-200"
                  }`} />
                  <p className="font-bold text-zinc-900 text-[15px] leading-snug truncate">
                    {table.label ?? `Mesa ${table.number}`}
                  </p>
                  {table.label && <span className="text-[11px] text-zinc-300 shrink-0">N°{table.number}</span>}
                  {occupied && st.orderCount > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      <ShoppingBag size={10} />
                      {st.orderCount}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 font-medium">
                  {!table.isActive ? (
                    <span className="text-zinc-400">Inactiva</span>
                  ) : occupied ? (
                    <span className={st.status === "PENDING_CONFIRM" ? "text-amber-600" : "text-emerald-600"}>
                      {st.status === "PENDING_CONFIRM" ? "Por confirmar" : "Ocupada"}
                      {" · "}{sinceLabel(st.openedAt)}
                      {" · $"}{st.total.toLocaleString("es-AR")}
                    </span>
                  ) : (
                    <span className="text-zinc-400">Libre</span>
                  )}
                </p>
                {occupied && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 font-semibold mt-1">
                    Ver pedidos <ChevronRight size={11} />
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setSelectedQr(table)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 active:bg-zinc-100 active:text-zinc-900 transition-colors"
                >
                  <QrCode size={17} strokeWidth={2} />
                </button>
                <button
                  onClick={() => toggleActive(table)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    table.isActive
                      ? "text-emerald-600 active:bg-emerald-50"
                      : "text-zinc-300 active:bg-zinc-100"
                  }`}
                >
                  <Power size={15} strokeWidth={2} />
                </button>
                <button
                  onClick={() => deleteTable(table)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-red-500 active:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <QrCode size={36} className="mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm">Creá tu primera mesa para generar el QR</p>
          </div>
        )}
      </div>

      {/* Modal QR — full screen en mobile */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" style={{ WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }} onClick={() => setSelectedQr(null)} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-xs shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Handle móvil */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-8 h-1 bg-zinc-200 rounded-full" />
            </div>

            <div className="p-5 sm:p-6 text-center">
              <div className="flex items-center justify-between mb-1">
                <div />
                <h3 className="font-bold text-zinc-900 text-lg">
                  {selectedQr.label ?? `Mesa ${selectedQr.number}`}
                </h3>
                <button
                  onClick={() => setSelectedQr(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">Escaneá para ver el menú</p>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  className="mx-auto rounded-2xl border border-zinc-100"
                  style={{ width: 200, height: 200 }}
                />
              ) : (
                <div className="w-[200px] h-[200px] mx-auto bg-zinc-100 rounded-2xl animate-pulse" />
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setSelectedQr(null)}
                  className="flex-1 border border-zinc-200 text-zinc-600 py-3.5 rounded-2xl text-sm font-medium active:bg-zinc-50 transition-colors min-h-[52px]"
                >
                  Cerrar
                </button>
                <button
                  onClick={downloadQr}
                  className="flex-1 bg-zinc-900 active:bg-zinc-700 text-white py-3.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[52px]"
                >
                  <Download size={14} />
                  Descargar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal QR de puerta — lista de espera */}
      {showDoorQr && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" style={{ WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }} onClick={() => setShowDoorQr(false)} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-xs shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-8 h-1 bg-zinc-200 rounded-full" />
            </div>
            <div className="p-5 sm:p-6 text-center">
              <div className="flex items-center justify-between mb-1">
                <div />
                <h3 className="font-bold text-zinc-900 text-lg">QR de puerta</h3>
                <button
                  onClick={() => setShowDoorQr(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">Escaneá para anotarte en la lista de espera</p>

              {doorQrUrl ? (
                <img
                  src={doorQrUrl}
                  alt="QR de puerta"
                  className="mx-auto rounded-2xl border border-violet-100"
                  style={{ width: 200, height: 200 }}
                />
              ) : (
                <div className="w-[200px] h-[200px] mx-auto bg-zinc-100 rounded-2xl animate-pulse" />
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowDoorQr(false)}
                  className="flex-1 border border-zinc-200 text-zinc-600 py-3.5 rounded-2xl text-sm font-medium active:bg-zinc-50 transition-colors min-h-[52px]"
                >
                  Cerrar
                </button>
                <button
                  onClick={downloadDoorQr}
                  className="flex-1 bg-violet-600 active:bg-violet-700 text-white py-3.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[52px]"
                >
                  <Download size={14} />
                  Descargar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Detalle en vivo de la sesión de una mesa ocupada */}
      <AnimatePresence>
        {detailTable && live[detailTable.id] && (() => {
          const st = live[detailTable.id];
          return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setDetailTable(null)} />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-md shadow-2xl max-h-[85vh] flex flex-col"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-8 h-1 bg-zinc-200 rounded-full" />
                </div>

                <div className="px-5 pt-3 pb-3 border-b border-zinc-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 text-lg truncate">{detailTable.label ?? `Mesa ${detailTable.number}`}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {st.status === "PENDING_CONFIRM" ? "Por confirmar" : "Ocupada"} · {sinceLabel(st.openedAt)}
                    </p>
                  </div>
                  <button onClick={() => setDetailTable(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200 shrink-0">
                    <X size={15} />
                  </button>
                </div>

                <div className="overflow-y-auto px-5 py-4 space-y-3">
                  {st.orders.length === 0 ? (
                    <p className="text-center text-zinc-400 text-sm py-6">La mesa está ocupada pero todavía no hizo pedidos.</p>
                  ) : st.orders.map((o, idx) => (
                    <div key={o.id} className="border border-zinc-100 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900">Ronda {idx + 1}</span>
                          <span className="text-zinc-300 font-mono text-[10px]">#{o.id.slice(-4).toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-zinc-50 text-zinc-600 border-zinc-200">
                          {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {o.items.map((it, j) => (
                          <div key={j} className="text-sm text-zinc-600">
                            <span className="font-semibold text-zinc-900">{it.quantity}×</span> {it.name}
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-zinc-100 mt-2.5 pt-2 flex justify-between">
                        <span className="text-xs text-zinc-500 font-medium">Subtotal</span>
                        <span className="text-sm font-semibold text-zinc-900 tabular-nums">${o.total.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 pt-3 border-t border-zinc-100">
                  {/* Confirmar mesa: si está PENDING_CONFIRM, el comensal está esperando */}
                  {st.status === "PENDING_CONFIRM" && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                      <p className="text-xs text-amber-700 mb-2">El comensal está esperando que confirmes la mesa para que su pedido avance.</p>
                      <button onClick={() => confirmSession(st.sessionId)} disabled={confirming}
                        className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm">
                        {confirming ? "Confirmando…" : "Confirmar mesa"}
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-900">Total de la mesa</span>
                    <span className="text-xl font-bold text-zinc-900 tabular-nums">${st.total.toLocaleString("es-AR")}</span>
                  </div>

                  {!showCloseForm ? (
                    <button onClick={() => setShowCloseForm(true)}
                      className="mt-3 w-full bg-zinc-900 active:bg-zinc-700 text-white font-bold py-3 rounded-2xl text-sm">
                      Cerrar cuenta y mesa
                    </button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-zinc-500 mb-1.5">¿Se cobró?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setSettled(true)} className={chipCls(settled === true)}>Sí</button>
                          <button onClick={() => { setSettled(false); setMethod(null); }} className={chipCls(settled === false)}>No</button>
                        </div>
                      </div>

                      {settled === true && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 mb-1.5">Método de cobro</p>
                          <div className="flex gap-2">
                            {(["EFECTIVO", "VIRTUAL", "OTRO"] as const).map((m) => (
                              <button key={m} onClick={() => setMethod(m)} className={chipCls(method === m)}>
                                {m === "EFECTIVO" ? "Efectivo" : m === "VIRTUAL" ? "Virtual" : "Otro"}
                              </button>
                            ))}
                          </div>
                          {method === "OTRO" && (
                            <input
                              value={methodOther}
                              onChange={(e) => setMethodOther(e.target.value)}
                              placeholder="¿Cuál? (ej: transferencia, QR externo…)"
                              maxLength={80}
                              className="mt-2 w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300"
                            />
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => closeSession(st.sessionId, true)}
                        disabled={closing || settled === null || (settled === true && !method)}
                        className="w-full bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm"
                      >
                        {closing ? "Cerrando…" : "Cerrar mesa"}
                      </button>
                      <button
                        onClick={() => closeSession(st.sessionId, false)}
                        disabled={closing}
                        className="w-full text-zinc-500 active:text-zinc-700 font-medium py-1.5 text-xs"
                      >
                        Cerrar sin completar datos
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
