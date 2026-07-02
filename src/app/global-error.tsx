"use client"; // Los error boundaries deben ser Client Components

import { useEffect } from "react";
import "./globals.css";

// Se activa solo si se rompe el layout raíz (caso extremo). Reemplaza toda la
// página, por eso define su propio <html> y <body>.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, path: typeof window !== "undefined" ? window.location.pathname : undefined }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 360, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Uy, algo salió mal</h1>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
              Tuvimos un problema. Probá recargar la página.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{ marginTop: 20, width: "100%", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer" }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
