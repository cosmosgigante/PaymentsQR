"use client";

import { useEffect, useState, useCallback } from "react";

type Log = { id: string; createdAt: string; actorName: string; category: string; action: string; detail: string; account: { ownerEmail: string; name: string | null } | null };

export default function TrazabilidadPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/setup/trazabilidad?limit=200", { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setLogs(d.logs ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trazabilidad</h1>
          <p className="text-gray-400 text-sm">Todo lo que los superadmins hacen en el panel y en cuentas de clientes</p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">Actualizar</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-sm">Aún no hay actividad de superadmins registrada.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100">
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-start gap-4">
              <div className="shrink-0 text-right min-w-[80px]">
                <p className="text-[11px] text-gray-400 font-mono">{new Date(l.createdAt).toLocaleDateString("es-AR")}</p>
                <p className="text-[10px] text-gray-300 font-mono">{new Date(l.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-900">{l.actorName}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{l.action}</span>
                  {l.account && <span className="text-[11px] text-gray-400">→ {l.account.name ?? l.account.ownerEmail}</span>}
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{l.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
