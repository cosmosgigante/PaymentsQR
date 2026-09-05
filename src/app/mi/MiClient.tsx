"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Clock, ArrowUpRight, MapPin, Navigation, Compass, UtensilsCrossed } from "lucide-react";

// ── Portal de clientes: la home del consumidor (clientes de nuestros clientes) ──
// Diseño propio, premium y neutral (no compite con el color de cada local): fondo
// cálido, acento coral, tipografía grande, motion. Una sola home curada: primero
// tus mesas activas (lo más urgente al abrir), después descubrir cerca. Funciona
// logueado y anónimo. El pulido acompaña a la función.

const ACCENT = "#ff5a36";

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
  return `hace ${h} h`;
}
const distLabel = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const catalogHref = (p: Place) => (p.vertical === "KIOSCO_DESPENSA" ? `/tienda/${p.slug}` : `/menu/${p.slug}`);
const verticalLabel = (v: string) => (v === "KIOSCO_DESPENSA" ? "Kiosco · Despensa" : "Gastronómico");

const spring = { type: "spring" as const, damping: 24, stiffness: 260 };

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
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState<"idle" | "locating" | "loading" | "ready" | "denied" | "error">("idle");
  const [places, setPlaces] = useState<Place[]>([]);

  function loginGoogle() {
    setBusy(true);
    document.cookie = `pqr_return=${encodeURIComponent("/mi")}; path=/; max-age=300; samesite=lax`;
    createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
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
          const r = await fetch(`/api/descubrir?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const d = await r.json();
          setPlaces(Array.isArray(d) ? d : []);
          setGeo("ready");
        } catch { setGeo("error"); }
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Si venís de /descubrir (o ?tab=descubrir), arrancamos la búsqueda sola.
  useEffect(() => { if (initialTab === "descubrir") searchNearby(); }, [initialTab, searchNearby]);

  const firstName = user ? user.name.split(" ")[0] : null;
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen-dvh" style={{ background: "#faf7f4", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
      {isSuperAdmin && (
        <a href="/setup" className="block bg-amber-400 text-amber-950 text-center text-xs font-bold py-2 px-4 active:bg-amber-500">
          👁️ Estás viendo el portal como superadmin · Volver al panel
        </a>
      )}

      {/* ── Header premium ── */}
      <div
        className="relative overflow-hidden px-5 pb-16"
        style={{ background: "linear-gradient(150deg, #1b1524 0%, #2a1a2e 55%, #3a1c2a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        {/* glow de acento */}
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-[90px] opacity-40" style={{ background: ACCENT }} />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full blur-[90px] opacity-20 bg-fuchsia-500" />

        <div className="relative max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/50 text-[11px] font-semibold tracking-widest uppercase">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ background: ACCENT }}>◗</span>
              PaymentsQR
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: ACCENT }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button onClick={logout} className="text-white/50 hover:text-white p-1.5" aria-label="Salir"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={loginGoogle} disabled={busy}
                className="flex items-center gap-2 bg-white/95 text-zinc-900 font-bold text-sm px-3.5 py-2 rounded-full disabled:opacity-60">
                <GoogleIcon /> Ingresar
              </button>
            )}
          </div>

          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            className="text-white font-black text-[2rem] leading-tight mt-8">
            {firstName ? `${saludo},` : "Pedí, seguí y pagá"}
            {firstName && <><br /><span style={{ color: ACCENT }}>{firstName}</span></>}
          </motion.h1>
          <p className="text-white/60 text-sm mt-2 max-w-[17rem]">
            {firstName ? "Tus mesas y los lugares cerca tuyo, en un solo lugar." : "Tu lugar para pedir en el local y descubrir dónde comer cerca."}
          </p>
        </div>
      </div>

      {/* ── Contenido (se superpone al header) ── */}
      <div className="max-w-md mx-auto px-4 -mt-10 space-y-6 relative">

        {/* Mesas activas — lo más urgente al abrir */}
        {sessions.length > 0 && (
          <section>
            <SectionTitle icon={<UtensilsCrossed size={13} />}>Tus mesas activas</SectionTitle>
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <motion.a
                  key={s.id} href={`/mesa/${s.qrToken}`}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.06 }}
                  className="block rounded-[26px] p-5 text-white relative overflow-hidden shadow-lg active:scale-[0.99] transition-transform"
                  style={{ background: "linear-gradient(135deg, #241a24 0%, #3a1f2b 100%)" }}
                >
                  <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30" style={{ background: ACCENT }} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                        {s.pendingConfirm ? "Esperando confirmación" : "Mesa abierta"}
                      </span>
                      <span className="flex items-center gap-1 text-white/40 text-[11px]"><Clock size={11} /> {sinceLabel(s.lastActivityAt)}</span>
                    </div>
                    <p className="font-black text-xl mt-2 leading-tight">{s.restaurant}</p>
                    <p className="text-white/60 text-sm">{s.tableLabel}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-white/40 text-[11px]">Lo que llevás</p>
                        <p className="font-bold text-lg tabular-nums">${s.myTotal.toLocaleString("es-AR")}</p>
                      </div>
                      <span className="flex items-center gap-1.5 font-bold text-sm px-4 py-2.5 rounded-full text-zinc-900" style={{ background: ACCENT }}>
                        Seguí tu pedido <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </section>
        )}

        {/* Descubrir cerca */}
        <section>
          <SectionTitle icon={<Compass size={13} />}>Cerca tuyo</SectionTitle>

          {(geo === "idle" || geo === "denied" || geo === "error") && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="bg-white rounded-[26px] p-6 border border-black/[0.04] shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white" style={{ background: ACCENT }}>
                <Navigation size={22} />
              </div>
              <p className="font-bold text-zinc-900 text-lg">Descubrí dónde pedir</p>
              <p className="text-zinc-500 text-sm mt-1 leading-relaxed">
                {geo === "denied" ? "No pudimos acceder a tu ubicación. Habilitá el permiso y probá de nuevo."
                  : geo === "error" ? "Tu navegador no permite geolocalización."
                  : "Activá tu ubicación y te mostramos los locales más cercanos. No la guardamos."}
              </p>
              <button onClick={searchNearby}
                className="mt-5 w-full text-white font-bold py-4 rounded-2xl text-[15px] min-h-[54px] flex items-center justify-center gap-2 active:opacity-90"
                style={{ background: "#17131c" }}>
                <Navigation size={17} /> Usar mi ubicación
              </button>
            </motion.div>
          )}

          {(geo === "locating" || geo === "loading") && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-black/[0.04] flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-zinc-100 rounded w-2/3" /><div className="h-2.5 bg-zinc-100 rounded w-1/3" /></div>
                </div>
              ))}
              <p className="text-center text-zinc-400 text-xs">{geo === "locating" ? "Ubicándote…" : "Buscando locales…"}</p>
            </div>
          )}

          {geo === "ready" && (
            places.length === 0 ? (
              <div className="bg-white rounded-[26px] p-8 border border-black/[0.04] text-center shadow-sm">
                <p className="text-zinc-500 text-sm font-medium">No encontramos locales cerca todavía</p>
                <p className="text-zinc-400 text-xs mt-1">Estamos sumando comercios a la red.</p>
                <button onClick={searchNearby} className="mt-3 font-bold text-sm" style={{ color: ACCENT }}>Buscar de nuevo</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {places.map((p, i) => (
                  <motion.a key={p.slug} href={catalogHref(p)}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}
                    className="flex items-center gap-3.5 bg-white rounded-2xl p-3.5 border border-black/[0.04] shadow-sm active:scale-[0.99] transition-transform">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden text-white font-black text-xl" style={{ background: p.primaryColor }}>
                      {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-[15px] truncate">{p.name}</p>
                      <p className="text-zinc-400 text-xs truncate mt-0.5">{verticalLabel(p.vertical)}{p.address ? ` · ${p.address}` : ""}</p>
                    </div>
                    <span className="flex flex-col items-center gap-0.5 shrink-0 px-1">
                      <span className="flex items-center gap-0.5 text-[13px] font-bold" style={{ color: ACCENT }}><MapPin size={12} /> {distLabel(p.distanceKm)}</span>
                    </span>
                  </motion.a>
                ))}
              </div>
            )
          )}
        </section>

        {/* Invitación a ingresar (si es anónimo) */}
        {!user && (
          <section>
            <div className="rounded-[26px] p-6 text-center border border-black/[0.04]" style={{ background: "linear-gradient(160deg, #fff 0%, #fff4f0 100%)" }}>
              <p className="font-bold text-zinc-900">Guardá tus pedidos</p>
              <p className="text-zinc-500 text-sm mt-1 leading-relaxed">Ingresá con Google y retomá tu mesa aunque cierres el navegador.</p>
              <button onClick={loginGoogle} disabled={busy}
                className="mt-4 w-full bg-white border border-zinc-200 active:bg-zinc-50 text-zinc-900 font-bold py-3.5 rounded-2xl text-[15px] min-h-[52px] flex items-center justify-center gap-2.5 shadow-sm">
                <GoogleIcon /> {busy ? "Abriendo…" : "Continuar con Google"}
              </button>
            </div>
          </section>
        )}

        {/* Sin mesas y logueado */}
        {user && sessions.length === 0 && (
          <p className="text-center text-zinc-400 text-xs pt-1">
            Cuando escanees el QR de una mesa, tu pedido va a aparecer acá.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-3 px-1 text-zinc-400">
      {icon}
      <span className="text-[11px] font-bold tracking-widest uppercase">{children}</span>
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
