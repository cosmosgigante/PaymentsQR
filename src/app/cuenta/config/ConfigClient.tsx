"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users2, CreditCard, LifeBuoy } from "lucide-react";
import { PLANS, formatArs, formatDate, paymentSourceLabel, type PlanType, type PaymentSource } from "@/lib/plans";

type Account = {
  name: string | null;
  ownerEmail: string;
  planType: string | null;
  priceArs: number | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  paymentSource: string | null;
  canceledAt: string | null;
  isActive: boolean;
};

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { vencido: true, d: 0, h: 0, m: 0 };
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { vencido: false, d, h, m };
}

export default function ConfigClient({ account }: { account: Account }) {
  const planLabel = account.planType && account.planType in PLANS ? PLANS[account.planType as PlanType].label : "—";
  const countdown = useCountdown(account.subscriptionEndsAt);
  const [canceledAt, setCanceledAt] = useState<string | null>(account.canceledAt);

  const [showCancel, setShowCancel] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setWorking(true);
    setError(null);
    const res = await fetch("/api/account/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: confirmText }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); setWorking(false); return; }
    setCanceledAt(data.canceledAt);
    setShowCancel(false);
    setConfirmText("");
    setWorking(false);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <div className="max-w-3xl mx-auto">
          <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3">
            <ArrowLeft size={16} /> Volver
          </Link>
          <h1 className="text-white font-bold text-2xl">Configuración de la cuenta</h1>
          <p className="text-white/50 text-sm mt-1">{account.name ?? account.ownerEmail}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ── Accesos especiales (B2) ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users2 size={18} className="text-blue-700" />
            <h2 className="font-semibold text-gray-800">Accesos especiales</h2>
          </div>
          <p className="text-sm text-gray-400">
            Compartí el panel con tus socios (cada uno con sus credenciales), con acceso completo o limitado a ciertos restoranes.
          </p>
          <span className="inline-block mt-3 text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
            Próximamente
          </span>
        </section>

        {/* ── Membresía actual ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Membresía actual</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Field label="Plan" value={planLabel} />
            <Field label="Precio" value={account.priceArs != null ? `${formatArs(account.priceArs)} ARS` : "—"} />
            <Field label="Forma de pago" value={paymentSourceLabel(account.paymentSource as PaymentSource)} />
            <Field label="Inicio" value={account.subscriptionStartedAt ? formatDate(account.subscriptionStartedAt) : "—"} />
            <Field label="Vence" value={account.subscriptionEndsAt ? formatDate(account.subscriptionEndsAt) : "—"} />
          </div>

          {/* Tiempo restante */}
          {countdown && (
            <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold ${
              countdown.vencido ? "bg-red-50 text-red-600 border border-red-200"
              : countdown.d <= 3 ? "bg-orange-50 text-orange-600 border border-orange-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {countdown.vencido
                ? "⏰ Tu plan venció"
                : `🕐 Quedan ${countdown.d} día${countdown.d !== 1 ? "s" : ""}, ${countdown.h} h y ${countdown.m} min`}
            </div>
          )}

          {/* Cancelar plan */}
          {canceledAt ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
              Plan <strong>cancelado</strong>. Seguís con acceso hasta el {account.subscriptionEndsAt ? formatDate(account.subscriptionEndsAt) : "vencimiento"}.
            </div>
          ) : !showCancel ? (
            <button onClick={() => { setShowCancel(true); setError(null); }}
              className="text-sm font-medium text-red-500 hover:text-red-700">
              Cancelar plan
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium mb-2">¿Seguro que querés cancelar?</p>
              <p className="text-xs text-red-500 mb-3">
                Escribí <strong>cancelar plan</strong> para confirmar. Vas a conservar el acceso hasta el vencimiento, pero no se renovará.
              </p>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="cancelar plan"
                className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-2" />
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleCancel} disabled={working || confirmText.trim().toLowerCase() !== "cancelar plan"}
                  className="text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-all">
                  {working ? "Cancelando..." : "Confirmar cancelación"}
                </button>
                <button onClick={() => { setShowCancel(false); setConfirmText(""); setError(null); }}
                  className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100">
                  No, volver
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Soporte ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <LifeBuoy size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">Soporte</h2>
          </div>
          <p className="text-sm text-gray-400 mb-3">¿Necesitás ayuda? Escribinos y te respondemos.</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://wa.me/?text=Hola,%20necesito%20ayuda%20con%20PaymentsQR"
              className="text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg transition-all">
              WhatsApp
            </a>
            <a href="mailto:soporte@paymentsqr.app?subject=Soporte%20PaymentsQR"
              className="text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg transition-all">
              Email
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
