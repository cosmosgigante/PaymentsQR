"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, BookOpen, QrCode, LogOut, TrendingUp, Package, Grid2X2, UtensilsCrossed, X } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/lib/types";
import { useSSE } from "@/hooks/useSSE";
import { useState, useCallback } from "react";

type Order = {
  id: string;
  status: string;
  paymentMode: string;
  total: number;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
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
      if (updated.status === "PAID" || updated.status === "CANCELLED") {
        setOrders((prev) => prev.filter((o) => o.id !== updated.id));
      } else {
        setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      }
    }
  }, []);

  useSSE("/api/events", handleSSE);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    const supabase = createClient();
    await supabase.auth.signOut(); // cierra también la sesión Google/Supabase
    router.push("/");
    router.refresh();
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.status === "PAID" || updated.status === "CANCELLED") {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: updated.status } : o));
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Hero header con gradiente */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pb-8"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        }}
      >
        {/* Decoración de fondo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-8 right-32 w-4 h-4 rounded-full bg-white/20" />
          <div className="absolute bottom-6 right-12 w-2 h-2 rounded-full bg-white/30" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg backdrop-blur-sm">
                🍽️
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Panel Admin</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors min-h-[44px] px-2"
            >
              <LogOut size={15} strokeWidth={2} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>

          {/* Saludo */}
          <div className="mb-6">
            <h1 className="text-white font-bold text-2xl">¿Cómo va el servicio?</h1>
          </div>

          {/* Stats dentro del hero */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: ordersToday,          label: "Pedidos hoy",  icon: <TrendingUp size={16} />, bg: "bg-white/20" },
              { value: stats.tablesCount,    label: "Mesas",        icon: <Grid2X2 size={16} />,    bg: "bg-white/15" },
              { value: stats.menuItemsCount, label: "Productos",    icon: <Package size={16} />,    bg: "bg-white/10" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`${stat.bg} backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20`}
              >
                <div className="text-white/70 mb-2">{stat.icon}</div>
                <p className="text-2xl sm:text-3xl font-black text-white leading-none">{stat.value}</p>
                <p className="text-white/60 text-[11px] mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-1 pb-8 space-y-4 pt-5">

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NavCard href="/cocina"      icon={<ChefHat size={22} strokeWidth={1.5} />}         title="Cocina"     subtitle="Pedidos en vivo"   iconBg="bg-orange-100"  iconColor="text-orange-500" />
          <NavCard href="/mozos"       icon={<UtensilsCrossed size={22} strokeWidth={1.5} />} title="Mozos"      subtitle="Entregar y cobrar" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          <NavCard href="/admin/menu"  icon={<BookOpen size={22} strokeWidth={1.5} />}        title="Menú"       subtitle="Gestionar platos"  iconBg="bg-blue-100"    iconColor="text-blue-500" />
          <NavCard href="/admin/mesas" icon={<QrCode size={22} strokeWidth={1.5} />}          title="Mesas"      subtitle="Códigos QR"        iconBg="bg-violet-100"  iconColor="text-violet-500" />
        </div>

        {/* Pedidos recientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Pedidos recientes</h2>
            <AnimatePresence>
              {newOrderId && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full border border-orange-200"
                >
                  🔔 ¡Nuevo pedido!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-gray-400 text-sm font-medium">Sin pedidos aún</p>
              <p className="text-gray-300 text-xs mt-1">Los pedidos aparecen acá en tiempo real</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ backgroundColor: order.id === newOrderId ? "#fff7ed" : "transparent" }}
                  animate={{ backgroundColor: "transparent" }}
                  transition={{ duration: 2 }}
                  className="px-4 sm:px-5 py-4 flex items-start sm:items-center gap-3"
                >
                  {/* Número de mesa */}
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-black text-orange-500 text-sm">{order.table.number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">
                        Mesa {order.table.number}{order.table.label ? ` — ${order.table.label}` : ""}
                      </span>
                      <span className="text-gray-300 text-[11px] font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                    </div>
                    {order.customerName && (
                      <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                        {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {order.items.map((item) => `${item.quantity}× ${item.menuItem.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                        <span className="font-bold text-gray-900 text-sm tabular-nums">
                          ${order.total.toLocaleString("es-AR")}
                        </span>
                      </div>
                      {order.status === "READY" && (
                        <button onClick={() => updateStatus(order.id, "DELIVERED")}
                          className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-all">
                          Entregar ✓
                        </button>
                      )}
                      {order.status === "DELIVERED" && (
                        <button onClick={() => updateStatus(order.id, "PAID")}
                          className="text-[11px] font-bold bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-all">
                          Cobrado ✓
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setOrders((prev) => prev.filter((o) => o.id !== order.id))}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
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

function NavCard({ href, icon, title, subtitle, iconBg, iconColor }: {
  href: string; icon: React.ReactNode; title: string; subtitle: string; iconBg: string; iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl p-4 flex flex-col gap-3 bg-white border border-gray-100 shadow-sm active:scale-[0.97] transition-transform"
    >
      <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-[15px] text-gray-900 leading-tight">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}
