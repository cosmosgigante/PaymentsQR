"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Store, CreditCard, Clock } from "lucide-react";

type Analytics = {
  clientes: { total: number; activos: number; inactivos: number; nuevos30: number };
  negocios: { total: number; activos: number; pendientes: number; gastronomicos: number; kioscos: number };
  ingresoSuscripciones: { mensualAprox: number };
};

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;

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
