"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Store, CreditCard, Clock, AlertTriangle } from "lucide-react";

type Pago = { id: string; nombre: string; plan: string; montoMensual: number; venceEl: string | null };
type Analytics = {
  clientes: { total: number; activos: number; inactivos: number; nuevos30: number };
  negocios: { total: number; activos: number; pendientes: number; gastronomicos: number; kioscos: number };
  ingresoSuscripciones: { mensualAprox: number };
  pagos: Pago[];
};

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;

// Clasifica el estado de cobro según la fecha de vencimiento de la suscripción.
type CobroKey = "vencida" | "pronto" | "ok" | "sinfecha";
function cobroStatus(venceEl: string | null): { key: CobroKey; dias: number | null } {
  if (!venceEl) return { key: "sinfecha", dias: null };
  const dias = Math.ceil((new Date(venceEl).getTime() - Date.now()) / 86400000);
  if (dias < 0) return { key: "vencida", dias };
  if (dias <= 7) return { key: "pronto", dias };
  return { key: "ok", dias };
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/setup/analytics", { cache: "no-store" });
      if (!r.ok) { setError(true); setLoading(false); return; }
      setData(await r.json());
    } catch { setError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-400 text-sm">Visión global de toda la plataforma</p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">Actualizar</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No se pudieron cargar las métricas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ingreso de suscripciones — el número que más importa para el negocio */}
          <div className="rounded-2xl p-5 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1e3a8a 100%)" }}>
            <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">
              <CreditCard size={14} /> Ingreso mensual por suscripciones
            </div>
            <p className="text-3xl font-black tabular-nums">{ars(data.ingresoSuscripciones.mensualAprox)}</p>
            <p className="text-white/50 text-xs mt-1">Suma de los planes de clientes activos (aprox.)</p>
          </div>

          {/* Alerta de cobro: suscripciones vencidas o por vencer */}
          {(() => {
            const vencidas = data.pagos.filter((p) => cobroStatus(p.venceEl).key === "vencida");
            const prontas = data.pagos.filter((p) => cobroStatus(p.venceEl).key === "pronto");
            if (vencidas.length === 0 && prontas.length === 0) return null;
            const montoEnRiesgo = [...vencidas, ...prontas].reduce((s, p) => s + p.montoMensual, 0);
            return (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                  <AlertTriangle size={16} /> Cobros por gestionar
                </div>
                <p className="text-amber-700 text-xs">
                  {vencidas.length > 0 && <><b>{vencidas.length}</b> vencida{vencidas.length > 1 ? "s" : ""}</>}
                  {vencidas.length > 0 && prontas.length > 0 && " · "}
                  {prontas.length > 0 && <><b>{prontas.length}</b> por vencer (7 días)</>}
                  {" · "}<b>{ars(montoEnRiesgo)}/mes</b> en juego
                </p>
              </div>
            );
          })()}

          {/* Quién paga y cuánto — el desglose del ingreso propio */}
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
              <CreditCard size={15} /> Quién nos paga
            </div>
            {data.pagos.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                <p className="text-gray-400 text-sm">Todavía no hay clientes con plan cargado.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {data.pagos.map((p) => {
                  const st = cobroStatus(p.venceEl);
                  return (
                    <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                          {st.key === "vencida" && <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Vencida</span>}
                          {st.key === "pronto" && <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Vence en {st.dias}d</span>}
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Plan {p.plan}{p.venceEl ? ` · vence ${new Date(p.venceEl).toLocaleDateString("es-AR")}` : ""}
                        </p>
                      </div>
                      <p className="text-base font-black text-emerald-600 tabular-nums shrink-0">{ars(p.montoMensual)}<span className="text-[10px] text-gray-400 font-medium">/mes</span></p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clientes */}
          <Section title="Clientes" icon={<Users size={15} />}>
            <Stat label="Total" value={data.clientes.total} />
            <Stat label="Activos" value={data.clientes.activos} tone="green" />
            <Stat label="Inactivos" value={data.clientes.inactivos} tone="gray" />
            <Stat label="Nuevos (30 días)" value={data.clientes.nuevos30} tone="blue" icon={<Clock size={12} />} />
          </Section>

          {/* Negocios */}
          <Section title="Negocios" icon={<Store size={15} />}>
            <Stat label="Total" value={data.negocios.total} />
            <Stat label="Activos" value={data.negocios.activos} tone="green" />
            <Stat label="Pendientes" value={data.negocios.pendientes} tone="amber" />
            <Stat label="Gastronómicos" value={data.negocios.gastronomicos} />
            <Stat label="Kioscos / Despensas" value={data.negocios.kioscos} />
          </Section>

        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
        {icon} {title}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "text-emerald-600", blue: "text-blue-600", amber: "text-amber-600", gray: "text-gray-400", default: "text-gray-900",
};

function Stat({ label, value, tone = "default", icon }: { label: string; value: string | number; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
      <p className="text-gray-400 text-[11px] font-medium flex items-center gap-1">{icon}{label}</p>
      <p className={`text-xl font-black tabular-nums mt-0.5 ${TONES[tone] ?? TONES.default}`}>{value}</p>
    </div>
  );
}
