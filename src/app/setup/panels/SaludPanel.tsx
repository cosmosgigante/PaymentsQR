"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Grupo = {
  message: string; source: string; path: string | null; count: number;
  lastSeen: string; digest: string | null; resueltoEl: string | null; resueltoPor: string | null;
};
type Data = { activos: Grupo[]; resueltos: Grupo[]; totalActivos: number; pendienteTabla?: boolean };

export default function SaludPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/setup/errors", { cache: "no-store" });
      setData(r.ok ? await r.json() : null);
    } catch { setData(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function accion(g: Grupo, action: "resolve" | "reopen") {
    setBusy(g.source + g.message);
    try {
      await fetch("/api/setup/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: g.message, source: g.source, action }),
      });
      await load();
    } catch { /* ignorar */ }
    setBusy(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Salud del sistema</h1>
          <p className="text-gray-400 text-sm">Errores de los últimos 30 días. Vacío es buena señal.</p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">Actualizar</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">No se pudieron cargar los errores.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SIN RESOLVER */}
          {data.activos.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" strokeWidth={1.5} />
              <p className="text-gray-700 text-sm font-semibold">Todo funcionando bien</p>
              <p className="text-gray-400 text-xs mt-1">
                {data.pendienteTabla ? "El registro de errores todavía no está activo." : "Sin errores sin resolver."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-2 text-amber-800 text-sm font-semibold">
                <AlertTriangle size={16} /> {data.totalActivos} error{data.totalActivos !== 1 ? "es" : ""} sin resolver · {data.activos.length} tipo{data.activos.length !== 1 ? "s" : ""}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {data.activos.map((g, i) => (
                  <ErrorRow key={i} g={g} busy={busy === g.source + g.message}
                    action={<button onClick={() => accion(g, "resolve")} disabled={busy === g.source + g.message}
                      className="shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                      {busy === g.source + g.message ? "..." : "Marcar resuelto"}
                    </button>} />
                ))}
              </div>
            </div>
          )}

          {/* RESUELTOS (historial) */}
          {data.resueltos.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                <CheckCircle2 size={14} /> Resueltos (historial)
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
                {data.resueltos.map((g, i) => (
                  <div key={i} className="px-4 py-3 opacity-70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Resuelto</span>
                          {g.path && <span className="text-[11px] text-gray-400 font-mono truncate">{g.path}</span>}
                        </div>
                        <p className="text-sm text-gray-700 break-words line-through decoration-gray-300">{g.message}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Resuelto {g.resueltoEl ? new Date(g.resueltoEl).toLocaleString("es-AR") : ""}{g.resueltoPor ? ` por ${g.resueltoPor}` : ""}
                        </p>
                      </div>
                      <button onClick={() => accion(g, "reopen")} disabled={busy === g.source + g.message}
                        className="shrink-0 text-gray-400 hover:text-gray-800 text-xs font-semibold px-2 py-1.5 rounded-lg">
                        Reabrir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorRow({ g, action }: { g: Grupo; busy: boolean; action: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${g.source === "SERVER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {g.source === "SERVER" ? "Servidor" : "Pantalla"}
            </span>
            <span className="text-xs font-black bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 tabular-nums">×{g.count}</span>
            {g.path && <span className="text-[11px] text-gray-400 font-mono truncate">{g.path}</span>}
          </div>
          <p className="text-sm text-gray-800 break-words">{g.message}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Última vez: {new Date(g.lastSeen).toLocaleString("es-AR")}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
