"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ChefHat, Bell, Utensils, CreditCard } from "lucide-react";
import { OrderStatus as Status, ORDER_STATUS_LABELS } from "@/lib/types";

// Vista unificada "Cuenta de la mesa": muestra las RONDAS de la sesión (cada
// pedido = una ronda) con sus ítems, su progreso propio y su total, más el total
// de la mesa y el pago. Es presentacional: se maneja 100% con `sessionOrders`
// (una sola fuente de verdad, refrescada por el poll de la sesión en MesaClient).

type OrderItem = {
  quantity: number;
  unitPrice: number;
  notes: string | null;
  menuItem: { name: string };
};

export type Ronda = {
  id: string;
  status: Status;
  paymentMode: string;
  total: number;
  table: { number: number; label: string | null };
  items: OrderItem[];
  createdAt: string;
  mine?: boolean;
  dinerIndex?: number;
};

const ALL_STEPS: { status: Status; icon: React.ReactNode; label: string }[] = [
  { status: "AWAITING_PAYMENT", icon: <CreditCard size={13} />, label: "Pagando" },
  { status: "PENDING",   icon: <Clock size={13} />,        label: "Recibido"  },
  { status: "CONFIRMED", icon: <CheckCircle2 size={13} />, label: "Confirmado" },
  { status: "PREPARING", icon: <ChefHat size={13} />,      label: "En cocina" },
  { status: "READY",     icon: <Bell size={13} />,          label: "Listo"     },
  { status: "DELIVERED", icon: <Utensils size={13} />,     label: "Servido"   },
];

// Pasos visibles para una ronda según su modo de pago (oculta los que no aplican).
function buildSteps(order: Pick<Ronda, "paymentMode" | "status">) {
  const hidden = new Set<Status>();
  if (order.paymentMode === "ONLINE") {
    hidden.add("PENDING");
    hidden.add("CONFIRMED");
  } else {
    hidden.add("AWAITING_PAYMENT");
    if (order.status !== "PENDING") hidden.add("PENDING");
    if (order.status !== "CONFIRMED") hidden.add("CONFIRMED");
  }
  if (order.status === "PAID") hidden.add("DELIVERED");
  return ALL_STEPS.filter((s) => !hidden.has(s.status));
}

const TERMINAL: Status[] = ["PAID", "CANCELLED"];

// ── Barra de progreso de una ronda ──────────────────────────────────────────
function RondaProgress({ order }: { order: Ronda }) {
  const steps = buildSteps(order);
  const currentIdx = steps.findIndex((s) => s.status === order.status);
  if (steps.length <= 1 || currentIdx < 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.status} className="flex items-center flex-1 min-w-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
              i < currentIdx ? "bg-zinc-900 text-white"
              : i === currentIdx ? "bg-zinc-900 text-white ring-4 ring-zinc-100"
              : "bg-zinc-100 text-zinc-300"
            }`}>
              {i < currentIdx ? <CheckCircle2 size={12} /> : step.icon}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${
                i < currentIdx ? "bg-zinc-900" : "bg-zinc-100"
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step, i) => (
          <p key={step.status} className={`text-[10px] text-center font-medium flex-1 leading-tight ${
            i <= currentIdx ? "text-zinc-700" : "text-zinc-300"
          }`}>
            {step.label}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Chip de estado (para rondas terminales o resumen compacto) ───────────────
function statusChip(status: Status) {
  if (status === "PAID")      return { text: "Pagado ✓",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (status === "CANCELLED") return { text: "Cancelado", cls: "bg-red-50 text-red-600 border-red-200" };
  if (status === "READY")     return { text: "Listo 🔔",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (status === "DELIVERED") return { text: "Servido",   cls: "bg-zinc-50 text-zinc-600 border-zinc-200" };
  return { text: ORDER_STATUS_LABELS[status], cls: "bg-amber-50 text-amber-700 border-amber-200" };
}

type Props = {
  tableToken: string;
  onPedirMas: () => void;
  onRefresh: () => void;
  sessionOrders: Ronda[];
  pendingConfirm?: boolean;
  payEnabled?: boolean;
  multiDiner?: boolean;
  paymentPending?: boolean;
};

export default function OrderStatusView({
  tableToken, onPedirMas, onRefresh, sessionOrders,
  pendingConfirm, payEnabled, multiDiner, paymentPending,
}: Props) {
  const [paying, setPaying] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // La cuenta = todas las rondas menos las canceladas.
  const bill = sessionOrders.filter((o) => o.status !== "CANCELLED");
  const billTotal = bill.reduce((s, o) => s + o.total, 0);
  const myUnpaid  = bill.filter((o) => o.mine && o.status !== "PAID").reduce((s, o) => s + o.total, 0);
  const allUnpaid = bill.filter((o) => o.status !== "PAID").reduce((s, o) => s + o.total, 0);
  const fullyPaid = bill.length > 0 && allUnpaid === 0;
  const hasCashierUnpaid = bill.some((o) => o.status !== "PAID" && o.paymentMode === "CASHIER");

  const table = sessionOrders[0]?.table;
  const tableLabel = table ? (table.label ?? `Mesa ${table.number}`) : "Mesa";

  const dinerLabel = (o: Ronda, idx: number) =>
    multiDiner ? (o.mine ? "Vos" : o.dinerIndex ? `Comensal ${o.dinerIndex}` : "Pedido") : `Ronda ${idx + 1}`;

  // Resumen del estado de la mesa para el encabezado.
  const activeCount = bill.filter((o) => !TERMINAL.includes(o.status)).length;
  const readyCount  = bill.filter((o) => o.status === "READY").length;
  const summary =
    fullyPaid ? "Cuenta pagada ✓"
    : readyCount > 0 ? `${readyCount} ${readyCount === 1 ? "pedido listo" : "pedidos listos"} 🔔`
    : activeCount > 0 ? "Preparando tus pedidos…"
    : `${bill.length} ${bill.length === 1 ? "pedido" : "pedidos"}`;

  async function cancelOrder(orderId: string) {
    setCancelingId(orderId);
    try {
      const r = await fetch("/api/mesa/cancel-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken, orderId }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setConfirmCancelId(null); onRefresh(); }
      else alert(d?.error ?? "No se pudo cancelar");
    } catch { alert("No se pudo cancelar"); }
    finally { setCancelingId(null); }
  }

  async function payBill(scope: "MINE" | "ALL") {
    setPaying(true);
    try {
      const r = await fetch("/api/mesa/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken, scope }),
      });
      const d = await r.json().catch(() => ({}));
      if (d?.initPoint) { window.location.href = d.initPoint; return; }
      alert(d?.error ?? "No se pudo iniciar el pago");
    } catch { alert("No se pudo iniciar el pago"); }
    finally { setPaying(false); }
  }

  return (
    <div
      className="min-h-screen-dvh bg-[#fafafa] overflow-y-auto"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-md mx-auto px-4 py-6 space-y-3">

        {/* Aviso: la mesa todavía no fue confirmada por el mozo */}
        {pendingConfirm && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-4 py-3 text-sm text-center font-medium">
            ⏳ Esperando que el mozo confirme tu mesa. Tus pedidos ya quedaron registrados.
          </div>
        )}

        {/* Encabezado: mesa + resumen + total de la cuenta */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-zinc-100"
        >
          <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">Cuenta de la mesa</p>
          <div className="flex items-end justify-between mt-1">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{tableLabel}</h1>
              <p className="text-zinc-500 text-sm mt-0.5">{summary}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-zinc-400">Total</p>
              <p className="text-2xl font-bold text-zinc-900 tabular-nums leading-none">
                ${billTotal.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Rondas de la mesa */}
        {bill.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-zinc-100 text-center">
            <p className="text-zinc-400 text-sm">Todavía no hay pedidos en la mesa.</p>
          </div>
        ) : (
          bill.map((o, idx) => {
            const chip = statusChip(o.status);
            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000));
            const isActive = !TERMINAL.includes(o.status);
            const canCancel = o.status === "PENDING" && o.mine !== false; // solo mis pedidos pendientes
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl p-5 border ${o.status === "READY" ? "border-emerald-200" : "border-zinc-100"}`}
              >
                {/* Cabecera de la ronda */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm font-bold ${o.mine ? "text-emerald-600" : "text-zinc-900"}`}>
                      {dinerLabel(o, idx)}
                    </span>
                    <span className="text-zinc-300 font-mono text-[10px]">#{o.id.slice(-4).toUpperCase()}</span>
                    {isActive && (
                      <span className="flex items-center gap-0.5 text-zinc-300 text-[10px]">
                        <Clock size={9} />{elapsed}min
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${chip.cls}`}>
                    {chip.text}
                  </span>
                </div>

                {/* Ítems de la ronda */}
                <div className="space-y-1.5">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-600 min-w-0">
                        <span className="font-semibold text-zinc-900">{item.quantity}×</span>{" "}
                        {item.menuItem.name}
                        {item.notes && <span className="block text-[11px] text-amber-600 italic">{item.notes}</span>}
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0 ml-2">
                        ${(item.quantity * item.unitPrice).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal de la ronda */}
                <div className="border-t border-zinc-100 mt-3 pt-2.5 flex justify-between">
                  <span className="text-zinc-500 text-xs font-medium">Subtotal</span>
                  <span className="font-semibold text-zinc-900 text-sm tabular-nums">
                    ${o.total.toLocaleString("es-AR")}
                  </span>
                </div>

                {/* Progreso de la ronda (solo si está activa) */}
                {isActive && <RondaProgress order={o} />}

                {/* Cancelar — solo mis rondas en PENDING (la cocina no las tomó) */}
                {canCancel && (
                  confirmCancelId === o.id ? (
                    <div className="mt-3 rounded-2xl border border-red-100 p-3 space-y-2">
                      <p className="text-sm text-zinc-600 text-center">¿Cancelar esta ronda?</p>
                      <div className="flex gap-2">
                        <button onClick={() => cancelOrder(o.id)} disabled={cancelingId === o.id}
                          className="flex-1 bg-red-500 active:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                          {cancelingId === o.id ? "Cancelando…" : "Sí, cancelar"}
                        </button>
                        <button onClick={() => setConfirmCancelId(null)} disabled={cancelingId === o.id}
                          className="flex-1 bg-zinc-100 active:bg-zinc-200 text-zinc-700 font-semibold py-2.5 rounded-xl text-sm">
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmCancelId(o.id)}
                      className="mt-2 w-full text-red-500 active:text-red-600 font-medium py-1.5 text-xs transition-all">
                      Cancelar ronda
                    </button>
                  )
                )}
              </motion.div>
            );
          })
        )}

        {/* Pago de la cuenta */}
        {fullyPaid ? (
          <div className="rounded-3xl p-4 text-center text-sm font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700">
            ✓ Cuenta pagada
          </div>
        ) : payEnabled && allUnpaid > 0 ? (
          <div className="space-y-2">
            {multiDiner && myUnpaid > 0 && (
              <button
                onClick={() => payBill("MINE")}
                disabled={paying}
                className="w-full bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all text-[15px] min-h-[56px]"
              >
                {paying ? "Abriendo MercadoPago…" : `Pagar lo mío · $${myUnpaid.toLocaleString("es-AR")}`}
              </button>
            )}
            <button
              onClick={() => payBill("ALL")}
              disabled={paying}
              className={`w-full disabled:opacity-50 font-bold py-4 rounded-2xl transition-all text-[15px] min-h-[56px] ${
                multiDiner && myUnpaid > 0
                  ? "bg-white border border-zinc-300 text-zinc-800 active:bg-zinc-50"
                  : "bg-emerald-600 active:bg-emerald-700 text-white"
              }`}
            >
              {paying ? "Abriendo MercadoPago…" : `${multiDiner ? "Pagar toda la cuenta" : "Pagar la cuenta"} · $${allUnpaid.toLocaleString("es-AR")}`}
            </button>
            {paymentPending && (
              <p className="text-center text-xs text-amber-600">Hay un pago en proceso para esta mesa.</p>
            )}
          </div>
        ) : hasCashierUnpaid ? (
          <div className="rounded-3xl p-4 text-center text-sm font-medium border bg-zinc-50 border-zinc-100 text-zinc-600">
            🧾  Pagás al final (efectivo o MercadoPago en la caja)
          </div>
        ) : null}

        {/* Seguir pidiendo */}
        <button
          onClick={onPedirMas}
          className="w-full bg-zinc-900 active:bg-zinc-700 text-white font-semibold py-3.5 rounded-2xl transition-all text-[15px] min-h-[52px]"
        >
          + Pedir más
        </button>
      </div>
    </div>
  );
}
