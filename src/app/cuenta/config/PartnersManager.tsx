"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";

type Resto = { id: string; name: string };
type Partner = {
  id: string;
  email: string;
  isOwner: boolean;
  accessScope: string;
  restaurantIds: string[];
  hasPassword: boolean;
};

export default function PartnersManager({ restaurants }: { restaurants: Resto[] }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", scope: "FULL" as "FULL" | "RESTRICTED", restaurantIds: [] as string[] });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/partners", { cache: "no-store" });
    if (res.ok) setPartners((await res.json()).partners);
    setLoading(false);
  }, []);
  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  function toggleResto(id: string) {
    setForm((f) => ({ ...f, restaurantIds: f.restaurantIds.includes(id) ? f.restaurantIds.filter((x) => x !== id) : [...f.restaurantIds, id] }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true); setError(null);
    const res = await fetch("/api/account/partners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, accessScope: form.scope, restaurantIds: form.restaurantIds }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); setWorking(false); return; }
    setForm({ email: "", scope: "FULL", restaurantIds: [] });
    setShowForm(false); setWorking(false);
    fetchPartners();
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/account/partners/${id}`, { method: "DELETE" });
    if (res.ok) setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  const restName = (id: string) => restaurants.find((r) => r.id === id)?.name ?? "—";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-all">
          + Agregar socio
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Email del socio</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="socio@gmail.com"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <p className="text-[11px] text-gray-400 mt-1">Entra con ese email (Google o contraseña), con sus propias credenciales.</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Tipo de acceso</label>
            <div className="grid grid-cols-2 gap-2">
              {([["FULL", "Completo"], ["RESTRICTED", "Restoranes específicos"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, scope: k }))}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${form.scope === k ? "bg-blue-900 text-white border-blue-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {form.scope === "FULL" ? "Maneja toda la cuenta, como vos." : "Solo los restoranes que elijas, sin la configuración de cuenta."}
            </p>
          </div>
          {form.scope === "RESTRICTED" && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Restoranes asignados</label>
              <div className="flex flex-wrap gap-2">
                {restaurants.map((r) => {
                  const on = form.restaurantIds.includes(r.id);
                  return (
                    <button key={r.id} type="button" onClick={() => toggleResto(r.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${on ? "bg-blue-900 text-white border-blue-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={working}
            className="text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-all">
            {working ? "Agregando..." : "Agregar socio"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-3">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 truncate">{p.email}</span>
                  {p.isOwner
                    ? <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Dueño</span>
                    : p.accessScope === "FULL"
                    ? <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Completo</span>
                    : <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Restringido</span>}
                </div>
                {!p.isOwner && p.accessScope === "RESTRICTED" && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{p.restaurantIds.map(restName).join(", ") || "sin restoranes"}</p>
                )}
              </div>
              {!p.isOwner && (
                <button onClick={() => handleRemove(p.id)} className="shrink-0 text-red-500/70 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all" title="Quitar socio">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
