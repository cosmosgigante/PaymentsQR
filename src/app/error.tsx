"use client"; // Los error boundaries deben ser Client Components

import { useEffect } from "react";

// Pantalla amable cuando algo se rompe dentro de una página (en vez de pantalla en blanco).
// El error queda logueado en el navegador; onRequestError (instrumentation.ts) captura los del servidor.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? "", error);
    // Reportar al panel "Salud del sistema" (best-effort, no bloquea la UI).
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, path: typeof window !== "undefined" ? window.location.pathname : undefined }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100" style={{ minHeight: "100dvh" }}>
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">😕</div>
        <h1 className="text-lg font-bold text-gray-900">Uy, algo salió mal</h1>
        <p className="text-gray-500 text-sm mt-1.5">
          Tuvimos un problema al cargar esta pantalla. Probá de nuevo en un momento.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="mt-5 w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold py-3 rounded-xl transition-colors"
        >
          Reintentar
        </button>
        {error.digest && (
          <p className="text-[10px] text-gray-300 mt-3 font-mono">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
