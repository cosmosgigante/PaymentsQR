"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, BookOpen, QrCode, LogOut, TrendingUp, Package, Grid2X2, UtensilsCrossed, X, ArrowLeft, History, BarChart3, Users } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from "@/lib/types";
import { useSSE } from "@/hooks/useSSE";
import { useState, useCallback, useEffect } from "react";

type Order = {
  id: string;
  status: string;
  paymentMode: string;
  total: number;
  createdAt: string;
  customerName?: string | null;
  table: { number: number; label: string | null };
  items: { quantity: number; menuItem: { name: string } }[];
};

type Props = {
  stats: { ordersToday: number; tablesCount: number; menuItemsCount: number };
  recentOrders: Order[];
  generalAdmin?: boolean;
  vertical?: string;
};

export default function AdminDashboard({ stats, recentOrders: initialOrders, generalAdmin, vertical = "GASTRONOMICO" }: Props) {
  const isGastro = vertical === "GASTRONOMICO";
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [ordersToday, setOrdersToday] = useState(stats.ordersToday);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [history, setHistory] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  // Cuántos grupos hay esperando (lista de espera, gestionada en Mozos).
  const fetchWaitlist = useCallback(async () => {
    try {
      const r = await fetch("/api/waitlist/staff");
      if (r.ok) {
        const d = await r.json();
        setWaitingCount((d.entries ?? []).filter((e: { status: string }) => e.status === "WAITING").length);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

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
    // La lista de espera cambió en otro dispositivo → refrescamos el contador.
    if (data.type === "WAITLIST_UPDATED" || data.type === "WAITLIST_TOGGLE") fetchWaitlist();
  }, [fetchWaitlist]);

  useSSE("/api/events", handleSSE);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    const supabase = createClient();
    await supabase.auth.signOut(); // cierra también la sesión Google/Supabase
    router.push("/");
    router.refresh();
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const res = await fetch("/api/orders?status=PAID&status=CANCELLED&today=1");
    if (res.ok) {
      const data = await res.json();
      setHistory(data);
      setHistoryTotal(data.filter((o: Order) => o.status === "PAID").reduce((s: number, o: Order) => s + o.total, 0));
    }
    setHistoryLoading(false);
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
              {generalAdmin && (
                <Link
                  href="/cuenta"
                  className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors min-h-[44px] pr-1 mr-0.5"
                >
                  <ArrowLeft size={16} strokeWidth={2} />
                  <span className="hidden sm:inline">Mi cuenta</span>
                </Link>
              )}
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
            <h1 className="text-white font-bold text-2xl">{isGastro ? "¿Cómo va el servicio?" : "¿Cómo va la venta?"}</h1>
          </div>

          {/* Stats dentro del hero */}
          <div className={`grid ${isGastro ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
            {[
              { value: ordersToday,          label: "Pedidos hoy",  icon: <TrendingUp size={16} />, bg: "bg-white/20" },
              ...(isGastro ? [{ value: stats.tablesCount, label: "Mesas", icon: <Grid2X2 size={16} />, bg: "bg-white/15" }] : []),
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
        {isGastro ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <NavCard href="/cocina"          icon={<ChefHat size={22} strokeWidth={1.5} />}         title="Cocina"     subtitle="Pedidos en vivo"   iconBg="bg-orange-100"  iconColor="text-orange-500" />
            <NavCard href="/mozos"           icon={<UtensilsCrossed size={22} strokeWidth={1.5} />} title="Mozos"      subtitle="Entregar y cobrar" iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <NavCard href="/admin/menu"      icon={<BookOpen size={22} strokeWidth={1.5} />}        title="Menú"       subtitle="Gestionar platos"  iconBg="bg-blue-100"    iconColor="text-blue-500" />
            <NavCard href="/admin/mesas"     icon={<QrCode size={22} strokeWidth={1.5} />}          title="Mesas"      subtitle="Códigos QR"        iconBg="bg-violet-100"  iconColor="text-violet-500" />
            <NavCard href="/admin/reportes"  icon={<BarChart3 size={22} strokeWidth={1.5} />}       title="Reportes"   subtitle="Ventas y métricas" iconBg="bg-indigo-100"  iconColor="text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NavCard href="/admin/menu"      icon={<BookOpen size={22} strokeWidth={1.5} />}        title="Catálogo"   subtitle="Tu vidriera"       iconBg="bg-blue-100"    iconColor="text-blue-500" />
            <NavCard href="/admin/qr"        icon={<QrCode size={22} strokeWidth={1.5} />}          title="QR"         subtitle="Clientes y personal" iconBg="bg-violet-100" iconColor="text-violet-500" />
            <NavCard href="/admin/reportes"  icon={<BarChart3 size={22} strokeWidth={1.5} />}       title="Reportes"   subtitle="Ventas y métricas" iconBg="bg-indigo-100"  iconColor="text-indigo-500" />
          </div>
        )}

        {/* Lista de espera — aparece solo si hay grupos esperando (se gestiona en Mozos) */}
        <AnimatePresence>
          {isGastro && waitingCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <Link href="/mozos"
                className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl p-4 active:bg-violet-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0">
                  <Users size={18} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {waitingCount} {waitingCount === 1 ? "grupo" : "grupos"} en lista de espera
                  </p>
                  <p className="text-xs text-gray-500">Tocá para llamar y sentar desde Mozos</p>
                </div>
                <span className="text-violet-400 text-lg">›</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pedidos — tabs Activos / Historial */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setActiveTab("active")}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Activos {orders.length > 0 && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">{orders.length}</span>}
              </button>
              <button onClick={() => { setActiveTab("history"); loadHistory(); }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <History size={11} /> Historial hoy
              </button>
            </div>
            <AnimatePresence>
              {newOrderId && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full border border-orange-200">
                  🔔 ¡Nuevo pedido!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Historial */}
          {activeTab === "history" && (
            <div>
              {historyLoading ? (
                <div className="p-8 flex justify-center"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : history.length === 0 ? (
                <div className="p-10 text-center"><p className="text-gray-400 text-sm">Sin pedidos completados hoy</p></div>
              ) : (
                <>
                  <div className="px-4 sm:px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-semibold">{history.filter((o) => o.status === "PAID").length} pagados · {history.filter((o) => o.status === "CANCELLED").length} cancelados</span>
                    <span className="text-sm font-bold text-emerald-700">${historyTotal.toLocaleString("es-AR")} recaudado</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {history.map((order) => (
                      <div key={order.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${order.status === "PAID" ? "bg-emerald-50" : "bg-red-50"}`}>
                          <span className={`font-black text-sm ${order.status === "PAID" ? "text-emerald-600" : "text-red-400"}`}>{isGastro ? order.table.number : "🏪"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{isGastro ? `Mesa ${order.table.number}${order.table.label ? ` — ${order.table.label}` : ""}` : `${order.customerName ?? "Cliente"} · #${order.id.slice(-4).toUpperCase()}`}</p>
                          <p className="text-xs text-gray-400 truncate">{order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 tabular-nums">${order.total.toLocaleString("es-AR")}</p>
                          <p className={`text-[10px] font-semibold ${order.status === "PAID" ? "text-emerald-600" : "text-red-400"}`}>
                            {order.status === "PAID" ? "Pagado ✓" : "Cancelado"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Activos */}
          {activeTab === "active" && (
          <div>
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-gray-400 text-sm font-medium">Sin pedidos activos</p>
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
                  {/* Mesa (gastro) / Retiro (kiosco) */}
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-black text-orange-500 text-sm">{isGastro ? order.table.number : "🏪"}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">
                        {isGastro ? `Mesa ${order.table.number}${order.table.label ? ` — ${order.table.label}` : ""}` : (order.customerName ?? "Cliente")}
                      </span>
                      <span className="text-gray-300 text-[11px] font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                    </div>
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
                      {/* Kiosco: avance directo PENDING→Preparando→Listo→Entregado/cobrado */}
                      {!isGastro && order.status === "PENDING" && (
                        <button onClick={() => updateStatus(order.id, "PREPARING")}
                          className="text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-all">
                          Preparar
                        </button>
                      )}
                      {!isGastro && order.status === "PREPARING" && (
                        <button onClick={() => updateStatus(order.id, "READY")}
                          className="text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all">
                          Listo p/ retirar
                        </button>
                      )}
                      {!isGastro && order.status === "READY" && (
                        <button onClick={() => updateStatus(order.id, "PAID")}
                          className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-all">
                          Entregado y cobrado ✓
                        </button>
                      )}
                      {isGastro && order.status === "READY" && (
                        <button onClick={() => updateStatus(order.id, "DELIVERED")}
                          className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-all">
                          Entregar ✓
                        </button>
                      )}
                      {isGastro && order.status === "DELIVERED" && (
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
