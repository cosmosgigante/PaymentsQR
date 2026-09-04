"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, ChevronRight } from "lucide-react";

type Place = {
  name: string;
  slug: string;
  primaryColor: string;
  logo: string | null;
  vertical: string;
  address: string | null;
  distanceKm: number;
};

function distLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const catalogHref = (p: Place) => (p.vertical === "KIOSCO_DESPENSA" ? `/tienda/${p.slug}` : `/menu/${p.slug}`);
const verticalLabel = (v: string) => (v === "KIOSCO_DESPENSA" ? "Kiosco · Despensa" : "Gastronómico");

export default function DescubrirPage() {
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "ready" | "denied" | "error">("idle");
  const [places, setPlaces] = useState<Place[]>([]);

  const search = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setStatus("error"); return; }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("loading");
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`/api/descubrir?lat=${latitude}&lng=${longitude}`);
          const d = await r.json();
          setPlaces(Array.isArray(d) ? d : []);
          setStatus("ready");
        } catch { setStatus("error"); }
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const busy = status === "locating" || status === "loading";

  return (
    <div
      className="min-h-screen-dvh bg-[#fafafa]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 pb-7"
        style={{ background: "linear-gradient(135deg, #172440 0%, #1b3882 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <MapPin size={15} /> Cerca tuyo
          </div>
          <h1 className="text-white font-bold text-2xl mt-1">Descubrí locales</h1>
          <p className="text-white/60 text-sm mt-1">Encontrá dónde pedir cerca de donde estás.</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-3">
        {/* Estado inicial / permiso / error → botón de ubicación */}
        {(status === "idle" || status === "denied" || status === "error") && (
          <div className="bg-white rounded-3xl p-6 border border-zinc-100 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Navigation size={22} />
            </div>
            <p className="font-bold text-zinc-900">Activá tu ubicación</p>
            <p className="text-zinc-500 text-sm mt-1 leading-relaxed">
              {status === "denied"
                ? "No pudimos acceder a tu ubicación. Habilitá el permiso en tu navegador y probá de nuevo."
                : status === "error"
                ? "Tu navegador no permite geolocalización. Probá con otro."
                : "La usamos solo para mostrarte los locales más cercanos. No la guardamos."}
            </p>
            <button
              onClick={search}
              className="mt-5 w-full bg-zinc-900 active:bg-zinc-700 text-white font-bold py-4 rounded-2xl text-[15px] min-h-[56px] flex items-center justify-center gap-2"
            >
              <Navigation size={17} /> Usar mi ubicación
            </button>
          </div>
        )}

        {/* Buscando */}
        {busy && (
          <div className="bg-white rounded-3xl p-10 border border-zinc-100 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">{status === "locating" ? "Obteniendo tu ubicación…" : "Buscando locales cerca…"}</p>
          </div>
        )}

        {/* Resultados */}
        {status === "ready" && (
          places.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-zinc-100 text-center">
              <p className="text-zinc-500 text-sm font-medium">No encontramos locales cerca todavía</p>
              <p className="text-zinc-400 text-xs mt-1">Estamos sumando comercios. Volvé pronto.</p>
              <button onClick={search} className="mt-4 text-blue-600 font-semibold text-sm">Buscar de nuevo</button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">
                {places.length} {places.length === 1 ? "local cerca" : "locales cerca"}
              </p>
              {places.map((p, i) => (
                <motion.a
                  key={p.slug}
                  href={catalogHref(p)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-zinc-100 active:bg-zinc-50 transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden text-white font-bold text-lg"
                    style={{ backgroundColor: p.primaryColor }}
                  >
                    {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 text-[15px] truncate">{p.name}</p>
                    <p className="text-zinc-400 text-xs truncate">
                      {verticalLabel(p.vertical)}{p.address ? ` · ${p.address}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-0.5 text-blue-600 text-xs font-bold">
                      <MapPin size={11} /> {distLabel(p.distanceKm)}
                    </span>
                    <div className="text-zinc-300 mt-0.5"><ChevronRight size={16} className="inline" /></div>
                  </div>
                </motion.a>
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}
