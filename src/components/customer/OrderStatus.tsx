"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ChefHat, Bell, Utensils, XCircle } from "lucide-react";
import { OrderStatus as Status, ORDER_STATUS_LABELS } from "@/lib/types";

type OrderItem = {
  quantity: number;
  unitPrice: number;
  notes: string | null;
  menuItem: { name: string };
};

type Order = {
  id: string;
  status: Status;
  paymentMode: string;
  total: number;
  table: { number: number; label: string | null };
  items: OrderItem[];
};

const STEPS: { status: Status; icon: React.ReactNode; label: string }[] = [
  { status: "PENDING",   icon: <Clock size={14} />,        label: "Recibido"  },
  { status: "CONFIRMED", icon: <CheckCircle2 size={14} />, label: "Confirmado" },
  { status: "PREPARING", icon: <ChefHat size={14} />,      label: "En cocina" },
  { status: "READY",     icon: <Bell size={14} />,          label: "Listo"     },
  { status: "DELIVERED", icon: <Utensils size={14} />,     label: "Servido"   },
];

type SessionOrderLite = { id: string; status: Status; total: number };

export default function OrderStatusView({ orderId, tableToken, onPedirMas, sessionOrders }: { orderId: string; tableToken: string; onPedirMas: () => void; sessionOrders?: SessionOrderLite[] }) {
  const [order, setOrder] = useState<Order | null>(null);

  const bill = (sessionOrders ?? []).filter((o) => o.status !== "CANCELLED");
  const billTotal = bill.reduce((s, o) => s + o.total, 0);

  useEffect(() => {
    let active = true;
    const fetchOrder = () =>
      fetch(`/api/orders/${orderId}?t=${tableToken}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((o) => { if (active && o) setOrder(o); })
        .catch(() => { /* ignore */ });

    fetchOrder();
    // Polling de respaldo: el SSE no entrega entre instancias serverless de Vercel.
    const poll = setInterval(fetchOrder, 5000);

    const es = new EventSource(`/api/events/order?orderId=${orderId}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "ORDER_UPDATED" && data.order.id === orderId) setOrder(data.order);
      } catch { /* ignore */ }
    };
    return () => { active = false; clearInterval(poll); es.close(); };
  }, [orderId, tableToken]);

  if (!order) {
    return (
      <div className="min-h-screen-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div
      className="min-h-screen-dvh bg-[#fafafa] overflow-y-auto"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-md mx-auto px-4 py-6 space-y-3">
        {/* Estado principal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-zinc-100 text-center"
        >
          {isCancelled ? (
            <XCircle size={44} className="text-red-400 mx-auto mb-3" strokeWidth={1.5} />
          ) : (
            <motion.div
              key={order.status}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="flex justify-center mb-3 text-zinc-700"
            >
              {STEPS[currentIdx]?.icon
                ? <span className="scale-[2.5] inline-block">{STEPS[currentIdx].icon}</span>
                : <span className="text-4xl">📋</span>
              }
            </motion.div>
          )}
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {ORDER_STATUS_LABELS[order.status]}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {order.table.label ?? `Mesa ${order.table.number}`} · #{order.id.slice(-4).toUpperCase()}
          </p>
        </motion.div>

        {/* Barra de progreso */}
        {!isCancelled && order.status !== "PAID" && (
          <div className="bg-white rounded-3xl p-5 border border-zinc-100">
            <div className="flex items-center">
              {STEPS.map((step, i) => (
                <div key={step.status} className="flex items-center flex-1 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                    i < currentIdx ? "bg-zinc-900 text-white"
                    : i === currentIdx ? "bg-zinc-900 text-white ring-4 ring-zinc-100"
                    : "bg-zinc-100 text-zinc-300"
                  }`}>
                    {i < currentIdx ? <CheckCircle2 size={13} /> : step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${
                      i < currentIdx ? "bg-zinc-900" : "bg-zinc-100"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2.5">
              {STEPS.map((step, i) => (
                <p key={step.status} className={`text-[10px] text-center font-medium flex-1 leading-tight ${
                  i <= currentIdx ? "text-zinc-700" : "text-zinc-300"
                }`}>
                  {step.label}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Detalle */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-100">
          <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase mb-3">Detalle</p>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-600">
                  <span className="font-semibold text-zinc-900">{item.quantity}×</span>{" "}
                  {item.menuItem.name}
                </span>
                <span className="text-zinc-500 tabular-nums">
                  ${(item.quantity * item.unitPrice).toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-zinc-900 text-sm">Total</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              ${order.total.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* Cuenta de la mesa — historial real de la sesión */}
        {bill.length > 1 && (
          <div className="bg-white rounded-3xl p-5 border border-zinc-100">
            <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase mb-3">Cuenta de la mesa</p>
            <div className="space-y-2">
              {bill.map((o, i) => (
                <div key={o.id} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600">
                    <span className="font-semibold text-zinc-900">Pedido {i + 1}</span>{" "}
                    <span className="text-zinc-400">#{o.id.slice(-4).toUpperCase()}</span>
                    {" · "}
                    <span className="text-zinc-500">{ORDER_STATUS_LABELS[o.status]}</span>
                  </span>
                  <span className="text-zinc-500 tabular-nums">${o.total.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 mt-3 pt-3 flex justify-between">
              <span className="font-semibold text-zinc-900 text-sm">Total mesa</span>
              <span className="font-bold text-zinc-900 tabular-nums">${billTotal.toLocaleString("es-AR")}</span>
            </div>
          </div>
        )}

        {/* Pago */}
        <div className={`rounded-3xl p-4 text-center text-sm font-medium border ${
          order.paymentMode === "CASHIER"
            ? "bg-zinc-50 border-zinc-100 text-zinc-600"
            : "bg-zinc-900 border-zinc-900 text-white"
        }`}>
          {order.paymentMode === "CASHIER"
            ? "🧾  Vas a pagar en la caja al terminar"
            : "💳  Pago online procesado"}
        </div>

        {/* Seguir pidiendo */}
        {order.status !== "CANCELLED" && (
          <button
            onClick={onPedirMas}
            className="w-full bg-zinc-900 active:bg-zinc-700 text-white font-semibold py-3.5 rounded-2xl transition-all text-[15px] min-h-[52px]"
          >
            + Pedir más
          </button>
        )}
      </div>
    </div>
  );
}
