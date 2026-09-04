"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, ChevronRight, Utensils, MapPin, Navigation } from "lucide-react";

// ── Portal de clientes (home del consumidor) ─────────────────────────────────
// Unifica "Mis mesas" (sesiones activas para retomar, requiere login) y
// "Descubrir" (locales cerca por ubicación, funciona anónimo). Es la home del
// consumidor: da valor logueado y sin loguear. (El pulido estético llega aparte.)

type SessionCard = {
  id: string; qrToken: string; tableLabel: string; restaurant: string;
  lastActivityAt: string; pendingConfirm: boolean;
  myOrders: number; myTotal: number; myUnpaid: number; tableTotal: number;
};

type Place = {
  name: string; slug: string; primaryColor: string; logo: string | null;
  vertical: string; address: string | null; distanceKm: number;
};

function sinceLabel(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${min % 60} min`;
}
function distLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
const catalogHref = (p: Place) => (p.vertical === "KIOSCO_DESPENSA" ? `/tienda/${p.slug}` : `/menu/${p.slug}`);
const verticalLabel = (v: string) => (v === "KIOSCO_DESPENSA" ? "Kiosco · Despensa" : "Gastronómico");

export default function MiClient({
  user,
  sessions,
  isSuperAdmin = false,
  initialTab,
}: {
  user: { name: string; email: string } | null;
  sessions: SessionCard[];
  isSuperAdmin?: boolean;
  initialTab?: "mesas" | "descubrir";
}) {
  const [tab, setTab] = useState<"mesas" | "descubrir">(initialTab ?? (user ? "mesas" : "descubrir"));
  const [loading, setLoading] = useState(false);

  // Descubrimiento (geolocalización)
  const [geo, setGeo] = useState<"idle" | "locating" | "loading" | "ready" | "denied" | "error">("idle");
  const [places, setPlaces] = useState<Place[]>([]);

  function loginGoogle() {
    setLoading(true);
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

  const searchNearby = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeo("error"); return; }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeo("loading");
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`/api/descubrir?lat=${latitude}&lng=${longitude}`);
          const d = await r.json();
          setPlaces(Array.isArray(d) ? d : []);
          setGeo("ready");
        } catch { setGeo("error"); }
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const tabCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${active ? "bg-white text-zinc-900 shadow-sm" : "text-white/70"}`;

  return (
    <div
      className="min-h-screen-dvh bg-[#fafafa]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {isSuperAdmin && (
        <a href="/setup" className="block bg-amber-400 text-amber-950 text-center text-xs font-bold py-2 px-4 active:bg-amber-500">
          👁️ Estás viendo el portal como superadmin · Volver al panel
        </a>
      )}

      {/* Header + tabs */}
      <div className="px-4 sm:px-6 pb-5" style={{ background: "linear-gradient(135deg, #172440 0%, #1b3882 100%)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white/60 text-xs">Portal de clientes</p>
            <p className="text-white font-bold text-lg truncate">{user ? user.name : "¡Hola! 👋"}</p>
          </div>
          {user ? (
            <button onClick={logout} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm px-2 min-h-[44px] shrink-0">
              <LogOut size={15} /> Salir
            </button>
          ) : (
            <button onClick={loginGoogle} disabled={loading}
              className="flex items-center gap-2 bg-white text-zinc-800 font-bold text-sm px-3.5 py-2 rounded-xl shrink-0 disabled:opacity-60">
              <GoogleIcon /> Ingresar
            </button>
          )}
        </div>

        <div className="max-w-md mx-auto mt-4 flex gap-1 bg-white/10 rounded-xl p-1">
          <button onClick={() => setTab("mesas")} className={tabCls(tab === "mesas")}>Mis mesas</button>
          <button onClick={() => setTab("descubrir")} className={tabCls(tab === "descubrir")}>Descubrir</button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-3">
        {/* ── MIS MESAS ── */}
        {tab === "mesas" && (
          !user ? (
            <div className="bg-white rounded-3xl p-8 border border-zinc-100 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-2xl">🍽️</div>
              <p className="font-bold text-zinc-900">Tus mesas y pedidos</p>
              <p className="text-zinc-500 text-sm mt-1 leading-relaxed">Ingresá con Google para retomar una mesa activa aunque hayas cerrado el navegador.</p>
              <button onClick={loginGoogle} disabled={loading}
                className="mt-5 w-full bg-zinc-900 active:bg-zinc-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-[15px] min-h-[56px] flex items-center justify-center gap-2.5">
                <GoogleIcon /> {loading ? "Abriendo Google…" : "Continuar con Google"}
              </button>
            </div>
          ) : sessions.length === 0 ? (
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
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold shrink-0">Volver <ChevronRight size={14} /></span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <span className="flex items-center gap-1 text-zinc-400 text-xs">
                    <Clock size={11} /> {sinceLabel(s.lastActivityAt)}
                    {s.pendingConfirm && <span className="ml-1 text-amber-600">· por confirmar</span>}
                  </span>
                  <span className="text-sm">
                    <span className="text-zinc-400">Lo mío </span>
                    <span className="font-bold text-zinc-900 tabular-nums">${s.myTotal.toLocaleString("es-AR")}</span>
                  </span>
                </div>
              </motion.a>
            ))
          )
        )}

        {/* ── DESCUBRIR ── */}
        {tab === "descubrir" && (
          <>
            {(geo === "idle" || geo === "denied" || geo === "error") && (
              <div className="bg-white rounded-3xl p-6 border border-zinc-100 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600"><Navigation size={22} /></div>
                <p className="font-bold text-zinc-900">Locales cerca tuyo</p>
                <p className="text-zinc-500 text-sm mt-1 leading-relaxed">
                  {geo === "denied" ? "No pudimos acceder a tu ubicación. Habilitá el permiso y probá de nuevo."
                    : geo === "error" ? "Tu navegador no permite geolocalización."
                    : "Activá tu ubicación para ver dónde pedir cerca. No la guardamos."}
                </p>
                <button onClick={searchNearby}
                  className="mt-5 w-full bg-zinc-900 active:bg-zinc-700 text-white font-bold py-4 rounded-2xl text-[15px] min-h-[56px] flex items-center justify-center gap-2">
                  <Navigation size={17} /> Usar mi ubicación
                </button>
              </div>
            )}

            {(geo === "locating" || geo === "loading") && (
              <div className="bg-white rounded-3xl p-10 border border-zinc-100 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm">{geo === "locating" ? "Obteniendo tu ubicación…" : "Buscando locales cerca…"}</p>
              </div>
            )}

            {geo === "ready" && (
              places.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-zinc-100 text-center">
                  <p className="text-zinc-500 text-sm font-medium">No encontramos locales cerca todavía</p>
                  <button onClick={searchNearby} className="mt-3 text-blue-600 font-semibold text-sm">Buscar de nuevo</button>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">
                    {places.length} {places.length === 1 ? "local cerca" : "locales cerca"}
                  </p>
                  {places.map((p, i) => (
                    <motion.a key={p.slug} href={catalogHref(p)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-zinc-100 active:bg-zinc-50 transition-colors">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden text-white font-bold text-lg" style={{ backgroundColor: p.primaryColor }}>
                        {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 text-[15px] truncate">{p.name}</p>
                        <p className="text-zinc-400 text-xs truncate">{verticalLabel(p.vertical)}{p.address ? ` · ${p.address}` : ""}</p>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-blue-600 text-xs font-bold shrink-0"><MapPin size={11} /> {distLabel(p.distanceKm)}</span>
                    </motion.a>
                  ))}
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
