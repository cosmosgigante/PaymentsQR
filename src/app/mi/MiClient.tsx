"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, ChevronRight, Utensils } from "lucide-react";

type SessionCard = {
  id: string;
  qrToken: string;
  tableLabel: string;
  restaurant: string;
  lastActivityAt: string;
  pendingConfirm: boolean;
  myOrders: number;
  myTotal: number;
  myUnpaid: number;
  tableTotal: number;
};

function sinceLabel(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${min % 60} min`;
}

export default function MiClient({
  user,
  sessions,
}: {
  user: { name: string; email: string } | null;
  sessions: SessionCard[];
}) {
  const [loading, setLoading] = useState(false);

  function loginGoogle() {
    setLoading(true);
    // Volvemos a /mi tras Google (el callback respeta pqr_return y no echa al consumidor).
    document.cookie = `pqr_return=${encodeURIComponent("/mi")}; path=/; max-age=300; samesite=lax`;
    createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/mi";
  }

  // ── Sin sesión: puerta de entrada ──
  if (!user) {
    return (
      <div
        className="min-h-screen-dvh flex flex-col items-center justify-center px-6 text-center"
        style={{
          background: "linear-gradient(160deg, #172440 0%, #1b3882 70%, #ffffff 160%)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 text-3xl">
            🍽️
          </div>
          <h1 className="text-2xl font-bold text-white">Tus mesas y pedidos</h1>
          <p className="text-white/70 mt-2 leading-relaxed text-sm">
            Ingresá con Google para retomar una mesa activa aunque hayas cerrado el navegador,
            y ver tus pedidos.
          </p>
          <button
            onClick={loginGoogle}
            disabled={loading}
            className="mt-7 w-full bg-white active:bg-zinc-100 disabled:opacity-60 text-zinc-800 font-bold py-4 rounded-2xl text-[15px] min-h-[56px] transition-all flex items-center justify-center gap-2.5 shadow-lg"
          >
            <GoogleIcon />
            {loading ? "Abriendo Google…" : "Continuar con Google"}
          </button>
        </div>
      </div>
    );
  }

  // ── Logueado: sesiones activas ──
  return (
    <div
      className="min-h-screen-dvh bg-[#fafafa]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #172440 0%, #1b3882 100%)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-white/60 text-xs">Mis pedidos</p>
            <p className="text-white font-bold text-lg truncate">{user.name}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm px-2 min-h-[44px]">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-3">
        <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">Mesas activas</p>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-zinc-100 text-center">
            <Utensils size={32} className="text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-500 text-sm font-medium">No tenés mesas activas ahora</p>
            <p className="text-zinc-400 text-xs mt-1">Escaneá el QR de una mesa para empezar a pedir.</p>
          </div>
        ) : (
          sessions.map((s) => (
            <motion.a
              key={s.id}
              href={`/mesa/${s.qrToken}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="block bg-white rounded-3xl p-5 border border-emerald-200 active:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900 text-[15px] truncate">{s.restaurant}</p>
                  <p className="text-zinc-500 text-sm">{s.tableLabel}</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold shrink-0">
                  Volver <ChevronRight size={14} />
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                <span className="flex items-center gap-1 text-zinc-400 text-xs">
                  <Clock size={11} /> {sinceLabel(s.lastActivityAt)}
                  {s.pendingConfirm && <span className="ml-1 text-amber-600">· por confirmar</span>}
                </span>
                <span className="text-sm">
                  <span className="text-zinc-400">Lo mío </span>
                  <span className="font-bold text-zinc-900 tabular-nums">${s.myTotal.toLocaleString("es-AR")}</span>
                  {s.myUnpaid > 0 && s.myUnpaid < s.myTotal && (
                    <span className="text-amber-600 text-xs"> · ${s.myUnpaid.toLocaleString("es-AR")} sin pagar</span>
                  )}
                </span>
              </div>
            </motion.a>
          ))
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
