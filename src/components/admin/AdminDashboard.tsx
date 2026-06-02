"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, BookOpen, QrCode, LogOut, TrendingUp, Package, Grid2X2 } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/lib/types";
import { useSSE } from "@/hooks/useSSE";
import { useState, useCallback } from "react";

type Order = {
  id: string;
  status: string;
  paymentMode: string;
  total: number;
  createdAt: string;
  table: { number: number; label: string | null };
  items: { quantity: number; menuItem: { name: string } }[];
};

type Props = {
  stats: { ordersToday: number; tablesCount: number; menuItemsCount: number };
  recentOrders: Order[];
};

export default function AdminDashboard({ stats, recentOrders: initialOrders }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [ordersToday, setOrdersToday] = useState(stats.ordersToday);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);

  const handleSSE = useCallback((data: { type: string; [k: string]: unknown }) => {
    if (data.type === "NEW_ORDER") {
      const order = data.order as Order;
      setOrders((prev) => [order, ...prev].slice(0, 10));
      setOrdersToday((n) => n + 1);
      setNewOrderId(order.id);
      setTimeout(() => setNewOrderId(null), 3000);
    }
    if (data.type === "ORDER_UPDATED") {
      const updated = data.order as Order;
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    }
  }, []);

  useSSE("/api/events", handleSSE);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen-dvh bg-[#fafafa]">
      {/* Header */}
      <div
        className="bg-white border-b border-zinc-100 px-4 sm:px-6"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center text-base flex-shrink-0">
              🍽️
            </div>
            <span className="font-bold text-zinc-900 text-[17px] tracking-tight">Panel Admin</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-zinc-400 active:text-zinc-700 transition-colors min-h-[44px] px-2"
          >
            <LogOut size={15} strokeWidth={2} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { value: ordersToday,         label: "Hoy",       icon: <TrendingUp size={15} />, color: "text-orange-500" },
            { value: stats.tablesCount,   label: "Mesas",     icon: <Grid2X2 size={15} />,    color: "text-blue-500"   },
            { value: stats.menuItemsCount, label: "Productos", icon: <Package size={15} />,    color: "text-emerald-500" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl p-4 border border-zinc-100"
            >
              <div className={`${stat.color} mb-2`}>{stat.icon}</div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <NavCard href="/cocina"      icon={<ChefHat size={20} strokeWidth={1.5} />} title="Cocina"       subtitle="Pedidos en vivo"     dark />
          <NavCard href="/admin/menu"  icon={<BookOpen size={20} strokeWidth={1.5} />} title="Menú"        subtitle="Agregar platos"            />
          <NavCard href="/admin/mesas" icon={<QrCode size={20} strokeWidth={1.5} />}   title="Mesas y QR"  subtitle="Generar códigos QR"        />
        </div>

        {/* Pedidos recientes */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-50 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900 text-sm">Pedidos recientes</h2>
            <AnimatePresence>
              {newOrderId && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full"
                >
                  ¡Nuevo pedido!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {orders.length === 0 ? (
            <div className="p-10 text-center text-zinc-400 text-sm">Sin pedidos aún</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ backgroundColor: order.id === newOrderId ? "#fff7ed" : "transparent" }}
                  animate={{ backgroundColor: "transparent" }}
                  transition={{ duration: 2 }}
                  className="px-4 sm:px-5 py-3.5 flex items-start sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-zinc-900 text-sm">
                        {order.table.label ?? `Mesa ${order.table.number}`}
                      </span>
                      <span className="text-zinc-300 text-[11px] font-mono">
                        #{order.id.slice(-4).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {order.items.map((item) => `${item.quantity}× ${item.menuItem.name}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                    <span className="font-bold text-zinc-900 text-sm tabular-nums">
                      ${order.total.toLocaleString("es-AR")}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavCard({ href, icon, title, subtitle, dark }: {
  href: string; icon: React.ReactNode; title: string; subtitle: string; dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl p-4 sm:p-5 flex items-center gap-3 transition-all border active:scale-[0.98] ${
        dark
          ? "bg-zinc-900 active:bg-zinc-800 text-white border-zinc-800"
          : "bg-white active:bg-zinc-50 text-zinc-900 border-zinc-100"
      }`}
    >
      <div className={`flex-shrink-0 ${dark ? "text-zinc-300" : "text-zinc-500"}`}>{icon}</div>
      <div className="min-w-0">
        <p className="font-bold text-sm">{title}</p>
        <p className={`text-xs mt-0.5 truncate ${dark ? "text-zinc-500" : "text-zinc-400"}`}>{subtitle}</p>
      </div>
    </Link>
  );
}
