"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, ChefHat, Clock } from "lucide-react";
import { Order, OrderItem, OrderStatus, ORDER_STATUS_LABELS } from "@/lib/types";
import { getOrders, updateOrderStatus } from "@/lib/api";


const ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

const ACTION: Partial<Record<OrderStatus, string>> = {
  PENDING: "Confirmar",
  CONFIRMED: "En preparación",
  PREPARING: "Marcar listo",
  READY: "Entregado",
};

const BORDER_COLOR: Record<string, string> = {
  PENDING: "border-l-amber-400",
  CONFIRMED: "border-l-blue-400",
  PREPARING: "border-l-orange-400",
  READY: "border-l-emerald-400",
};

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
  PREPARING: "bg-orange-50 text-orange-700 border border-orange-200",
  READY: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export default function KitchenBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    getOrders()
      .then((data) => {
        setOrders(data.filter((o) => ACTIVE.includes(o.status)));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const es = new EventSource("/api/events");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "NEW_ORDER") {
        setOrders((prev) => [data.order, ...prev]);
      } else if (data.type === "ORDER_UPDATED") {
        setOrders((prev) => prev.map((o) => o.id === data.order.id ? data.order : o));
      }
    };
    return () => es.close();
  }, []);

  async function advance(order: Order) {
    const next = NEXT[order.status];
    if (!next) return;
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } catch { /* ignorar error de red */ }
  }

  const active = orders.filter((o) => ACTIVE.includes(o.status));

  return (
    <div className="min-h-screen-dvh bg-zinc-950 text-zinc-100" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-2.5">
          <ChefHat size={18} className="text-zinc-400" strokeWidth={1.5} />
          <h1 className="font-bold text-base tracking-tight">Cocina</h1>
          <span className="text-zinc-500 text-sm">
            {active.length} activo{active.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {connected
            ? <Wifi size={13} className="text-emerald-400" strokeWidth={2} />
            : <WifiOff size={13} className="text-zinc-600" strokeWidth={2} />
          }
          <span className={`text-xs font-medium ${connected ? "text-emerald-400" : "text-zinc-600"}`}>
            {connected ? "En vivo" : "Sin conexión"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-3">
          <ChefHat size={36} strokeWidth={1} />
          <p className="text-sm">Sin pedidos activos</p>
        </div>
      ) : (
        // Grid: 1 col en mobile, 2 en tablet, 3+ en desktop
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
          <AnimatePresence>
            {active.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <OrderCard order={order} onAdvance={() => advance(order)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: () => void }) {
  const [updating, setUpdating] = useState(false);
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const nextAction = ACTION[order.status];

  async function handle() {
    setUpdating(true);
    await onAdvance();
    setUpdating(false);
  }

  return (
    <div className={`bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 border-l-4 ${BORDER_COLOR[order.status]}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between border-b border-zinc-800 gap-2">
        <div className="min-w-0">
          <p className="font-bold text-white text-xl leading-tight">
            Mesa {order.table.number}
          </p>
          {order.table.label && (
            <p className="text-zinc-400 text-xs leading-tight truncate">{order.table.label}</p>
          )}
          <p className="text-zinc-600 text-xs font-mono mt-0.5">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${BADGE[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <div className="flex items-center gap-1 text-zinc-500">
            <Clock size={10} strokeWidth={2} />
            <span className="text-[11px]">{elapsed}min</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <span className="text-zinc-400 font-bold w-6 flex-shrink-0 text-right">{item.quantity}×</span>
            <div className="min-w-0">
              <span className="text-zinc-100">{item.menuItem.name}</span>
              {item.notes && (
                <p className="text-xs text-zinc-500 italic mt-0.5 leading-snug">{item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Aclaraciones del pedido */}
      {order.notes && (
        <div className="mx-4 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Aclaraciones</p>
          <p className="text-xs text-amber-200 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-600 truncate">
          {order.paymentMode === "CASHIER" ? "Paga en caja" : "Pago online"}
        </span>
        {nextAction && (
          <button
            onClick={handle}
            disabled={updating}
            className="bg-white active:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-xs font-bold px-3 py-2 rounded-xl transition-all flex-shrink-0 min-h-[36px]"
          >
            {updating ? "..." : nextAction}
          </button>
        )}
      </div>
    </div>
  );
}
