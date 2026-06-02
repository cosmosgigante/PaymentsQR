"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/useSSE";
import { ArrowLeft, Clock, BellRing } from "lucide-react";
import Link from "next/link";
import { OrderStatus } from "@/lib/types";

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
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.3);
      });
    } catch { /* ignorar si el browser bloquea audio */ }
  }

  const handleSSE = useCallback((data: { type: string; [k: string]: unknown }) => {
    if (data.type === "NEW_ORDER") {
      const o = data.order as Order;
      if (o.status === "READY") setOrders((prev) => [...prev, o]);
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "DELIVERED" } : o));
    }
  }

  async function markPaid(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  }

  const ready = orders.filter((o) => o.status === "READY");
  const delivered = orders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex items-center gap-3"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <Link href="/admin" className="w-9 h-9 flex items-center justify-center text-zinc-400 active:text-white">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight">Panel Mozos</h1>
          <p className="text-zinc-500 text-xs">Pedidos listos para entregar</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {alertOrderId && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full"
              >
                <BellRing size={12} className="animate-bounce" />
                ¡Pedido listo!
              </motion.div>
            )}
          </AnimatePresence>
          {ready.length > 0 && (
            <span className="bg-emerald-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">
              {ready.length}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* LISTOS — entregar ahora */}
        <div>
          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
            🟢 Listos para entregar ({ready.length})
          </p>

          {ready.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <p className="text-zinc-500 text-sm">Ningún pedido listo todavía</p>
              <p className="text-zinc-600 text-xs mt-1">Los pedidos listos aparecen acá automáticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {ready.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl overflow-hidden"
                  >
                    <OrderCard order={order} onDeliver={() => markDelivered(order.id)} onPaid={() => markPaid(order.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ENTREGADOS — pendiente de cobro */}
        {delivered.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              ⏳ Entregados — pendiente de cobro ({delivered.length})
            </p>
            <div className="space-y-3">
              {delivered.map((order) => (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden opacity-70">
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
      {/* Header de la card */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <div>
          <p className="font-black text-white text-3xl leading-none">Mesa {order.table.number}</p>
          {order.table.label && <p className="text-zinc-400 text-xs mt-0.5">{order.table.label}</p>}
          <p className="text-zinc-600 text-xs font-mono mt-0.5">#{order.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock size={12} strokeWidth={2} />
          <span className="text-xs">{elapsed}min</span>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <span className="text-zinc-400 font-bold w-6 text-right flex-shrink-0">{item.quantity}×</span>
            <div>
              <span className="text-zinc-100">{item.menuItem.name}</span>
              {item.notes && <p className="text-xs text-zinc-500 italic mt-0.5">{item.notes}</p>}
            </div>
          </div>
        ))}
        {order.notes && (
          <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Aclaraciones</p>
            <p className="text-xs text-amber-200">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Footer — pago + acciones */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
        {/* Modo de pago */}
        {order.paymentMode === "ONLINE" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            ✓ Ya pagó online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            💵 Paga en caja
          </span>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2">
          {isReady && (
            <button
              onClick={onDeliver}
              className="bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Entregar ✓
            </button>
          )}
          {!isReady && order.paymentMode === "CASHIER" && (
            <button
              onClick={onPaid}
              className="bg-zinc-700 active:bg-zinc-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Cobrado ✓
            </button>
          )}
          {!isReady && order.paymentMode === "ONLINE" && (
            <button
              onClick={onPaid}
              className="bg-zinc-700 active:bg-zinc-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Cerrar ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
