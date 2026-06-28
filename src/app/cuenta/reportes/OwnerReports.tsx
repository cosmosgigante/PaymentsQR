"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Receipt, ShoppingBag, CreditCard, BarChart3, Store, Download } from "lucide-react";

type DaySales = { date: string; revenue: number; count: number };
type TopItem = { name: string; qty: number; revenue: number };
type ReportData = {
  days: number;
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  cashierOrders: number;
  onlineOrders: number;
  salesByDay: DaySales[];
  topItems: TopItem[];
};

type Restaurant = { id: string; name: string };

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export default function OwnerReports({ restaurants }: { restaurants: Restaurant[] }) {
  const [selected, setSelected] = useState(restaurants[0]?.id ?? "");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/reports?days=${range}&restaurantId=${selected}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range, selected]);

  const maxRevenue = data ? Math.max(...data.salesByDay.map((d) => d.revenue), 1) : 1;
  const selectedName = restaurants.find((r) => r.id === selected)?.name ?? "";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pb-6"
        style={{
          background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)",
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        }}
      >
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/cuenta" className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <ArrowLeft size={18} strokeWidth={2} />
              </Link>
              <BarChart3 size={18} className="text-white/80" />
              <span className="font-bold text-white text-lg">Reportes</span>
            </div>
          </div>

          {/* Selector de restaurante */}
          {restaurants.length > 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                    selected === r.id ? "bg-white text-blue-900" : "bg-white/15 text-white/70 hover:bg-white/25"
                  }`}
                >
                  <Store size={12} /> {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Selector de rango + exportar */}
          <div className="flex items-center gap-2 flex-wrap">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  range === d ? "bg-white/30 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
              >
                {d} días
              </button>
            ))}
            <div className="flex-1" />
            <a href={`/api/reports/csv?days=${range}&restaurantId=${selected}`}
              className="flex items-center gap-1 text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all">
              <Download size={11} /> CSV
            </a>
            {restaurants.length > 1 && (
              <a href={`/api/reports/csv?days=${range}&all=1`}
                className="flex items-center gap-1 text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-all">
                <Download size={11} /> Todos
              </a>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Error al cargar reportes</div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">

          {/* Nombre del restaurante */}
          {restaurants.length > 1 && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedName}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<TrendingUp size={18} />} iconBg="bg-emerald-100" iconColor="text-emerald-600"
              value={`$${data.totalRevenue.toLocaleString("es-AR")}`} label="Facturado" />
            <StatCard icon={<Receipt size={18} />} iconBg="bg-blue-100" iconColor="text-blue-600"
              value={data.totalOrders.toString()} label="Pedidos pagados" />
            <StatCard icon={<ShoppingBag size={18} />} iconBg="bg-violet-100" iconColor="text-violet-600"
              value={`$${Math.round(data.avgTicket).toLocaleString("es-AR")}`} label="Ticket promedio" />
            <StatCard icon={<CreditCard size={18} />} iconBg="bg-orange-100" iconColor="text-orange-600"
              value={`${data.onlineOrders} / ${data.cashierOrders}`} label="Online / Caja" />
          </div>

          {/* Gráfico por día */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Ventas por día</h3>
            {data.salesByDay.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.salesByDay.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 w-16 shrink-0 font-medium">{formatDate(day.date)}</span>
                    <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 3 : 0)}%` }}
                      />
                      {day.revenue > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-600 tabular-nums">
                          ${day.revenue.toLocaleString("es-AR")}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{day.count}p</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top platos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Platos más pedidos</h3>
            </div>
            {data.topItems.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.topItems.map((item, i) => (
                  <div key={item.name} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                      i === 0 ? "bg-amber-100 text-amber-600"
                      : i === 1 ? "bg-gray-100 text-gray-500"
                      : i === 2 ? "bg-orange-50 text-orange-400"
                      : "bg-gray-50 text-gray-400"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.qty} unidades</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                      ${item.revenue.toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; value: string; label: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`${iconBg} w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} mb-3`}>
        {icon}
      </div>
      <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
      <p className="text-gray-400 text-[11px] mt-1 font-medium">{label}</p>
    </div>
  );
}
