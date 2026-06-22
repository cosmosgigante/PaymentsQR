"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, ChefHat, Clock, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { Order, OrderStatus } from "@/lib/types";
import { getOrders, updateOrderStatus } from "@/lib/api";
import { KITCHEN_ACTIVE, nextKitchenStatus, kitchenActionLabel } from "@/lib/orderFlow";

function playOrderSound() {
  try {
    const ctx = new AudioContext();
    // Doble beep agudo para que se escuche en cocina
    [0, 0.2].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "square";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  } catch { /* navegador sin audio */ }
}

const ACTIVE = KITCHEN_ACTIVE;

const STATUS_STYLE: Record<string, { border: string; badge: string; label: string }> = {
  PENDING:   { border: "border-l-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pendiente"      },
  CONFIRMED: { border: "border-l-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200",      label: "Confirmado"     },
  PREPARING: { border: "border-l-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200",label: "Preparando"     },
  READY:     { border: "border-l-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200",label: "Listo"       },
};

type TableGroup = { tableNumber: number; tableLabel: string | null; orders: Order[] };

function groupByTable(orders: Order[]): TableGroup[] {
  const map = new Map<number, TableGroup>();
  for (const o of orders) {
    const n = o.table.number;
    if (!map.has(n)) map.set(n, { tableNumber: n, tableLabel: o.table.label, orders: [] });
    map.get(n)!.orders.push(o);
  }
  return Array.from(map.values()).sort((a, b) => a.tableNumber - b.tableNumber);
}

function tableColor(orders: Order[]) {
  if (orders.every((o) => o.status === "READY")) return "border-emerald-500 bg-emerald-950/30";
  if (orders.some((o) => o.status === "PENDING")) return "border-amber-500 bg-amber-950/20";
  if (orders.some((o) => o.status === "PREPARING")) return "border-orange-500 bg-orange-950/20";
  return "border-blue-500 bg-blue-950/20";
}

export default function KitchenBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [flowConfirm, setFlowConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = soundEnabled;

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data.filter((o) => ACTIVE.includes(o.status)));
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch("/api/restaurant/flow").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) { setFlowConfirm(d.flowConfirmEnabled); }
    }).catch(() => {});
    fetchOrders();
    const poll = setInterval(fetchOrders, 4000);
    const es = new EventSource("/api/events");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "NEW_ORDER") {
          if (soundRef.current) playOrderSound();
          setOrders((prev) =>
            ACTIVE.includes(data.order.status) && !prev.find((o) => o.id === data.order.id)
              ? [data.order, ...prev] : prev
          );
        } else if (data.type === "ORDER_UPDATED") {
          setOrders((prev) => {
            const updated = data.order as Order;
            if (!ACTIVE.includes(updated.status)) return prev.filter((o) => o.id !== updated.id);
            return prev.map((o) => o.id === updated.id ? updated : o);
          });
        }
      } catch { /* ignorar */ }
    };
    return () => { clearInterval(poll); es.close(); };
  }, [fetchOrders]);

  async function advance(order: Order) {
    const next = nextKitchenStatus(order.status, flowConfirm);
    if (!next) return;
    const updated = await updateOrderStatus(order.id, next);
    setOrders((prev) => {
      if (!ACTIVE.includes(updated.status)) return prev.filter((o) => o.id !== updated.id);
      return prev.map((o) => o.id === updated.id ? updated : o);
    });
  }

  const groups = groupByTable(orders);

  return (
    <div className="min-h-screen-dvh bg-zinc-950 text-zinc-100" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="border-b border-zinc-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-2.5">
          <ChefHat size={18} className="text-zinc-400" strokeWidth={1.5} />
          <h1 className="font-bold text-base tracking-tight">Cocina</h1>
          <span className="text-zinc-500 text-sm">{groups.length} mesa{groups.length !== 1 ? "s" : ""} activa{groups.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg active:bg-zinc-800 transition-colors"
          >
            {soundEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-zinc-600" />}
            <span className={soundEnabled ? "text-emerald-400" : "text-zinc-600"}>{soundEnabled ? "Sonido" : "Mudo"}</span>
          </button>
          <div className="flex items-center gap-1.5">
            {connected ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-zinc-600" />}
            <span className={`text-xs font-medium ${connected ? "text-emerald-400" : "text-zinc-600"}`}>{connected ? "En vivo" : "Sin conexión"}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-3">
          <ChefHat size={36} strokeWidth={1} />
          <p className="text-sm">Sin pedidos activos</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
          <AnimatePresence>
            {groups.map((group) => (
              <motion.div key={group.tableNumber} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}>
                <TableCard group={group} onAdvance={advance} flowConfirm={flowConfirm} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TableCard({ group, onAdvance, flowConfirm }: { group: TableGroup; onAdvance: (o: Order) => Promise<void>; flowConfirm: boolean }) {
  const allReady = group.orders.every((o) => o.status === "READY");
  const colorClass = tableColor(group.orders);
  const tableTotal = group.orders.reduce((s, o) => s + o.total, 0);
  const customerNames = [...new Set(group.orders.map((o) => o.customerName).filter(Boolean))];

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${colorClass}`}>
      {/* Cabecera de mesa */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="font-black text-white text-2xl leading-none">Mesa {group.tableNumber}</p>
          {group.tableLabel && <p className="text-zinc-400 text-xs mt-0.5">{group.tableLabel}</p>}
          {customerNames.length > 0 && <p className="text-zinc-300 text-xs mt-0.5 font-semibold">{customerNames.join(", ")}</p>}
        </div>
        <div className="text-right">
          <p className="text-zinc-400 text-xs">{group.orders.length} pedido{group.orders.length !== 1 ? "s" : ""}</p>
          <p className="text-zinc-300 text-xs font-mono">${tableTotal.toLocaleString("es-AR")}</p>
          {allReady && <p className="text-emerald-400 text-xs font-bold mt-0.5">✓ Todo listo</p>}
        </div>
      </div>

      {/* Pedidos de la mesa */}
      <div className="divide-y divide-zinc-800/60">
        {group.orders.map((order) => (
          <OrderRow key={order.id} order={order} onAdvance={onAdvance} flowConfirm={flowConfirm} />
        ))}
      </div>
    </div>
  );
}

function OrderRow({ order, onAdvance, flowConfirm }: { order: Order; onAdvance: (o: Order) => Promise<void>; flowConfirm: boolean }) {
  const [updating, setUpdating] = useState(false);
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const nextAction = kitchenActionLabel(order.status, flowConfirm);
  const style = STATUS_STYLE[order.status];
  const hasAllergyNote = order.notes || order.items.some((i) => i.notes);

  async function handle() {
    setUpdating(true);
    await onAdvance(order);
    setUpdating(false);
  }

  return (
    <div className={`border-l-4 ${style.border} px-3 py-3`}>
      {/* Meta */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${style.badge}`}>{style.label}</span>
          {order.customerName && <span className="text-zinc-300 text-[11px] font-semibold truncate">{order.customerName}</span>}
          <span className="text-zinc-600 font-mono text-[10px] shrink-0">#{order.id.slice(-5).toUpperCase()}</span>
          {hasAllergyNote && <AlertTriangle size={11} className="text-amber-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-1 text-zinc-600">
          <Clock size={10} />
          <span className="text-[10px]">{elapsed}min</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <span className="text-zinc-400 font-bold w-5 shrink-0 text-right">{item.quantity}×</span>
            <div>
              <span className="text-zinc-100">{item.menuItem.name}</span>
              {item.notes && <p className="text-[11px] text-amber-300 italic mt-0.5">{item.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Nota del pedido */}
      {order.notes && (
        <div className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2">
          <p className="text-[10px] text-amber-400 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Acción */}
      {nextAction && (
        <button onClick={handle} disabled={updating}
          className="w-full bg-white active:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-xs font-bold py-2 rounded-xl transition-all min-h-[34px]">
          {updating ? "..." : nextAction}
        </button>
      )}
    </div>
  );
}
