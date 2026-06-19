"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/useSSE";
import { ArrowLeft, Clock, BellRing } from "lucide-react";
import Link from "next/link";
import WaitlistPanel from "@/components/waiter/WaitlistPanel";

type OrderItem = { id: string; quantity: number; notes: string | null; menuItem: { name: string } };
type Order = {
  id: string; status: string; paymentMode: string; total: number;
  notes: string | null; createdAt: string;
  table: { number: number; label: string | null };
  items: OrderItem[];
};
type TableGroup = { tableNumber: number; tableLabel: string | null; orders: Order[] };

const ACTIVE = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

function groupByTable(orders: Order[]): TableGroup[] {
  const map = new Map<number, TableGroup>();
  for (const o of orders) {
    const n = o.table.number;
    if (!map.has(n)) map.set(n, { tableNumber: n, tableLabel: o.table.label, orders: [] });
    map.get(n)!.orders.push(o);
  }
  return Array.from(map.values()).sort((a, b) => a.tableNumber - b.tableNumber);
}

export default function WaiterBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [alertTableNum, setAlertTableNum] = useState<number | null>(null);
  const [flowDelivered, setFlowDelivered] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playBeep() {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      [0, 0.2].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.3);
      });
    } catch { /* ignorar */ }
  }

  const handleSSE = useCallback((data: { type: string; [k: string]: unknown }) => {
    if (data.type === "NEW_ORDER") {
      setOrders((prev) => [...prev, data.order as Order]);
    }
    if (data.type === "ORDER_UPDATED") {
      const updated = data.order as Order;
      if (updated.status === "READY") {
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === updated.id);
          return exists ? prev.map((o) => o.id === updated.id ? updated : o) : [...prev, updated];
        });
        playBeep();
        setAlertTableNum(updated.table.number);
        setTimeout(() => setAlertTableNum(null), 4000);
      } else if (updated.status === "PAID" || updated.status === "CANCELLED") {
        setOrders((prev) => prev.filter((o) => o.id !== updated.id));
      } else {
        setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      }
    }
  }, []);

  useEffect(() => {
    fetch("/api/restaurant/flow").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setFlowDelivered(d.flowDeliveredEnabled);
    }).catch(() => {});
  }, []);

  useSSE("/api/events", handleSSE);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) return;
        const data = await res.json();
        setOrders(data.filter((o: Order) => ACTIVE.includes(o.status)));
      } catch { /* ignorar */ }
    }, 4000);
    return () => clearInterval(poll);
  }, []);

  async function patchOrder(orderId: string, status: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      if (status === "PAID" || status === "CANCELLED") {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      }
    }
  }

  const readyOrders = orders.filter((o) => o.status === "READY");
  const groups = groupByTable(orders);
  const readyGroups = groups.filter((g) => g.orders.some((o) => o.status === "READY" || (!flowDelivered && o.status === "READY")));
  const otherGroups = groups.filter((g) => g.orders.every((o) => o.status !== "READY"));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative overflow-hidden px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <ArrowLeft size={18} strokeWidth={2} />
              </Link>
              <span className="font-bold text-white text-lg">Panel Mozos</span>
            </div>
            <AnimatePresence>
              {alertTableNum !== null && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                  <BellRing size={12} className="animate-bounce" /> Mesa {alertTableNum} lista
                </motion.div>
              )}
            </AnimatePresence>
            {readyOrders.length > 0 && (
              <span className="bg-emerald-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shadow">{readyOrders.length}</span>
            )}
          </div>
          <p className="text-white/70 text-sm">{greeting} 👋</p>
          <h1 className="text-white font-bold text-2xl mt-0.5">
            {readyGroups.length > 0 ? `${readyGroups.length} mesa${readyGroups.length > 1 ? "s" : ""} lista${readyGroups.length > 1 ? "s" : ""} para entregar` : "Sin mesas listas aún"}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* LISTA DE ESPERA */}
        <WaitlistPanel />

        {/* MESAS CON ALGO LISTO */}
        {readyGroups.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-3">🟢 Listas para entregar</p>
            <div className="space-y-3">
              <AnimatePresence>
                {readyGroups.map((g) => (
                  <motion.div key={g.tableNumber} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <TableCard group={g} onPatch={patchOrder} flowDelivered={flowDelivered} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* MESAS EN COCINA / ENTREGADAS */}
        {otherGroups.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-3">🟠 En proceso</p>
            <div className="space-y-3">
              {otherGroups.map((g) => (
                <TableCard key={g.tableNumber} group={g} onPatch={patchOrder} flowDelivered={flowDelivered} />
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Sin mesas activas</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TableCard({ group, onPatch, flowDelivered }: { group: TableGroup; onPatch: (id: string, status: string) => void; flowDelivered: boolean }) {
  const tableTotal = group.orders.reduce((s, o) => s + o.total, 0);
  const hasReady = group.orders.some((o) => o.status === "READY");
  const allDelivered = group.orders.every((o) => o.status === "DELIVERED");

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 ${hasReady ? "border-emerald-400/70" : "border-gray-100"}`}>
      {/* Cabecera de mesa */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-black text-gray-900 text-3xl leading-none">Mesa {group.tableNumber}</p>
          {group.tableLabel && <p className="text-gray-400 text-xs mt-0.5">{group.tableLabel}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{group.orders.length} pedido{group.orders.length !== 1 ? "s" : ""}</p>
          <p className="text-sm font-bold text-gray-700 tabular-nums">${tableTotal.toLocaleString("es-AR")}</p>
        </div>
      </div>

      {/* Pedidos */}
      <div className="divide-y divide-gray-50">
        {group.orders.map((order) => {
          const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
          const isReady = order.status === "READY";
          const isDelivered = order.status === "DELIVERED";
          return (
            <div key={order.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isReady ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isDelivered ? "bg-gray-50 text-gray-500 border-gray-200"
                    : "bg-orange-50 text-orange-600 border-orange-200"
                  }`}>
                    {isReady ? "Listo ✓" : isDelivered ? "Entregado" : "En cocina"}
                  </span>
                  <span className="text-gray-300 font-mono text-[10px]">#{order.id.slice(-5).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={10} /><span className="text-[10px]">{elapsed}min</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}</p>
              {order.notes && <p className="text-xs text-amber-600 italic mb-2">{order.notes}</p>}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold ${order.paymentMode === "ONLINE" ? "text-emerald-600" : "text-amber-600"}`}>
                  {order.paymentMode === "ONLINE" ? "✓ Pagó online" : "💵 Paga en caja"}
                </span>
                {isReady && flowDelivered && (
                  <button onClick={() => onPatch(order.id, "DELIVERED")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                    Entregar ✓
                  </button>
                )}
                {isReady && !flowDelivered && (
                  <button onClick={() => onPatch(order.id, "PAID")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                    Cobrar ✓
                  </button>
                )}
                {isDelivered && (
                  <button onClick={() => onPatch(order.id, "PAID")}
                    className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
                    {order.paymentMode === "ONLINE" ? "Cerrar ✓" : "Cobrado ✓"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Acción global de mesa (si todos entregados) */}
      {allDelivered && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={() => group.orders.forEach((o) => onPatch(o.id, "PAID"))}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold py-2.5 rounded-xl">
            Cobrar mesa completa ✓
          </button>
        </div>
      )}
    </div>
  );
}
