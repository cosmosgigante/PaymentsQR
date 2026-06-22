"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="max-w-lg mx-auto bg-zinc-900 text-white rounded-2xl shadow-2xl border border-zinc-800 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm leading-snug flex-1">
          Usamos cookies esenciales para que el sistema funcione (sesión, autenticación).
          No usamos cookies de publicidad ni tracking.{" "}
          <Link href="/privacidad" className="underline text-white/70 hover:text-white">Más info</Link>
        </p>
        <button
          onClick={accept}
          className="bg-white text-zinc-900 font-bold text-sm px-5 py-2 rounded-xl hover:bg-zinc-100 transition-all shrink-0"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
