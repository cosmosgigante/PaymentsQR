"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/useSSE";
import { ArrowLeft, Clock, BellRing } from "lucide-react";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  notes: string | null;
  menuItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  paymentMode: string;
  total: number;
  notes: string | null;
  createdAt: string;
  table: { number: number; label: string | null };
  items: OrderItem[];
};

export default function WaiterBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [alertOrderId, setAlertOrderId] = useState<string | null>(null);
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
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.3);
      });
    } catch { /* ignorar si el browser bloquea audio */ }
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
        setAlertOrderId(updated.id);
        setTimeout(() => setAlertOrderId(null), 4000);
      } else if (updated.status === "PAID" || updated.status === "CANCELLED") {
        setOrders((prev) => prev.filter((o) => o.id !== updated.id));
      } else {
        setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      }
    }
  }, []);

  useSSE("/api/events", handleSSE);

  async function markDelivered(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  async function markPaid(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  const ready      = orders.filter((o) => o.status === "READY");
  const inProgress = orders.filter((o) => ["PENDING","CONFIRMED","PREPARING"].includes(o.status));
  const delivered  = orders.filter((o) => o.status === "DELIVERED");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Hero — mismo estilo que panel admin */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pb-6"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <ArrowLeft size={18} strokeWidth={2} />
              </Link>
              <span className="font-bold text-white text-lg">Panel Mozos</span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {alertOrderId && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow"
                  >
                    <BellRing size={12} className="animate-bounce" /> ¡Pedido listo!
                  </motion.div>
                )}
              </AnimatePresence>
              {ready.length > 0 && (
                <span className="bg-emerald-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shadow">
                  {ready.length}
                </span>
              )}
            </div>
          </div>
          <p className="text-white/70 text-sm">{greeting} 👋</p>
          <h1 className="text-white font-bold text-2xl mt-0.5">
            {ready.length > 0
              ? `${ready.length} pedido${ready.length > 1 ? "s" : ""} listo${ready.length > 1 ? "s" : ""} para entregar`
              : "Sin pedidos listos aún"}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* EN COCINA */}
        {inProgress.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-3">🟠 En cocina ({inProgress.length})</p>
            <div className="space-y-2">
              {inProgress.map((order) => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-black text-gray-900 text-2xl leading-none">Mesa {order.table.number}</p>
                      {order.table.label && <p className="text-gray-400 text-xs mt-0.5">{order.table.label}</p>}
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-600 border border-orange-200">
                      {order.status === "PENDING" ? "Pendiente" : order.status === "CONFIRMED" ? "Confirmado" : "Preparando"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}</p>
                  <div className="mt-2">
                    {order.paymentMode === "ONLINE"
                      ? <span className="text-[11px] font-semibold text-emerald-600">✓ Ya pagó online</span>
                      : <span className="text-[11px] font-semibold text-amber-600">💵 Paga en caja</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTOS PARA ENTREGAR */}
        <div>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-3">🟢 Listos para entregar ({ready.length})</p>
          {ready.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-400 text-sm">Ningún pedido listo todavía</p>
              <p className="text-gray-300 text-xs mt-1">Aparecen acá automáticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {ready.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border-2 border-emerald-400/60 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <OrderCard order={order} onDeliver={() => markDelivered(order.id)} onPaid={() => markPaid(order.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ENTREGADOS */}
        {delivered.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">⏳ Entregados — cobrar ({delivered.length})</p>
            <div className="space-y-3">
              {delivered.map((order) => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm opacity-75">
                  <OrderCard order={order} onDeliver={() => {}} onPaid={() => markPaid(order.id)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onDeliver, onPaid }: { order: Order; onDeliver: () => void; onPaid: () => void }) {
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isReady = order.status === "READY";

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-black text-gray-900 text-3xl leading-none">Mesa {order.table.number}</p>
          {order.table.label && <p className="text-gray-400 text-xs mt-0.5">{order.table.label}</p>}
          <p className="text-gray-300 text-xs font-mono mt-0.5">#{order.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock size={12} strokeWidth={2} />
          <span className="text-xs">{elapsed}min</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <span className="text-gray-400 font-bold w-6 text-right flex-shrink-0">{item.quantity}×</span>
            <div>
              <span className="text-gray-800">{item.menuItem.name}</span>
              {item.notes && <p className="text-xs text-gray-400 italic mt-0.5">{item.notes}</p>}
            </div>
          </div>
        ))}
        {order.notes && (
          <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Aclaraciones</p>
            <p className="text-xs text-amber-700">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
        {order.paymentMode === "ONLINE" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            ✓ Ya pagó online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            💵 Paga en caja
          </span>
        )}
        <div className="flex gap-2">
          {isReady && (
            <button onClick={onDeliver} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
              Entregar ✓
            </button>
          )}
          {!isReady && (
            <button onClick={onPaid} className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
              {order.paymentMode === "ONLINE" ? "Cerrar ✓" : "Cobrado ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
