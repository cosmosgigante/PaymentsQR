"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

type Props = { slug: string; restaurantName: string; primaryColor: string; waitlistEnabled: boolean; estimatedWait: number };
type Status = { status: string; position: number; name: string; partySize: number; estimatedWait: number | null; tableNumber: number | null; calledAt: string | null; expiresAt: string | null; seatedAt: string | null };

const STORAGE_KEY = (slug: string) => `pqr_waitlist_${slug}`;

export default function WaitlistClient({ slug, restaurantName, primaryColor, waitlistEnabled, estimatedWait }: Props) {
  const [phase, setPhase] = useState<"form" | "waiting" | "closed">("form");
  const [form, setForm] = useState({ name: "", partySize: 2 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<Status | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);

  // Restaurar estado si ya se anotó
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(slug));
    if (saved) { setClientToken(saved); setPhase("waiting"); }
    if (!waitlistEnabled) setPhase("closed");
  }, [slug, waitlistEnabled]);

  const pollStatus = useCallback(async (token: string) => {
    const r = await fetch(`/api/waitlist/status?token=${token}`);
    if (r.ok) { const d = await r.json(); setStatusData(d); }
  }, []);

  useEffect(() => {
    if (phase !== "waiting" || !clientToken) return;
    pollStatus(clientToken);
    const interval = setInterval(() => pollStatus(clientToken), 5000);
    return () => clearInterval(interval);
  }, [phase, clientToken, pollStatus]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const r = await fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: form.name.trim(), partySize: form.partySize }),
    });
    const d = await r.json();
    setSubmitting(false);
    if (!r.ok) { setError(d.error ?? "Error al anotarse"); return; }
    localStorage.setItem(STORAGE_KEY(slug), d.clientToken);
    setClientToken(d.clientToken);
    setStatusData({ status: "WAITING", position: d.position, name: form.name, partySize: form.partySize, estimatedWait: d.estimatedWait, tableNumber: null, calledAt: null, expiresAt: null, seatedAt: null });
    setPhase("waiting");
  }

  function leave() {
    localStorage.removeItem(STORAGE_KEY(slug));
    setClientToken(null); setStatusData(null); setPhase("form");
  }

  const expiresIn = statusData?.expiresAt
    ? Math.max(0, Math.ceil((new Date(statusData.expiresAt).getTime() - Date.now()) / 1000))
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, #fff 100%)` }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">{restaurantName}</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Lista de espera</p>

        {phase === "closed" && (
          <div className="text-center">
            <XCircle size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-semibold">La lista de espera no está activa</p>
            <p className="text-gray-400 text-sm mt-1">Acercate al ingreso para ser ubicado.</p>
          </div>
        )}

        {phase === "form" && (
          <form onSubmit={join} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">Tu nombre</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Martín" maxLength={60}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">¿Cuántos son?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, partySize: n }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${form.partySize === n ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={submitting || !form.name.trim()}
              style={{ backgroundColor: primaryColor }}
              className="w-full text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50 transition-all">
              {submitting ? "Anotándose..." : "Anotar mi lugar"}
            </button>
            <p className="text-gray-400 text-xs text-center">Tiempo estimado: ~{estimatedWait} min por persona antes que vos</p>
          </form>
        )}

        {phase === "waiting" && statusData && (
          <div className="text-center space-y-4">
            {statusData.status === "WAITING" && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${primaryColor}22` }}>
                  <span className="text-4xl font-black" style={{ color: primaryColor }}>{statusData.position}</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">Tu posición en la lista</p>
                {statusData.estimatedWait && (
                  <div className="flex items-center justify-center gap-1.5 text-gray-400 text-sm">
                    <Clock size={14} /><span>~{statusData.estimatedWait} min de espera</span>
                  </div>
                )}
                <div className="bg-gray-50 rounded-2xl p-3 text-sm">
                  <p className="text-gray-700 font-semibold">{statusData.name}</p>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mt-0.5">
                    <Users size={13} /><span>{statusData.partySize} personas</span>
                  </div>
                </div>
                <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-xs">Esta pantalla se actualiza sola</p>
              </>
            )}

            {statusData.status === "CALLED" && (
              <div className="space-y-3">
                <AlertCircle size={48} className="text-amber-500 mx-auto animate-bounce" />
                <p className="text-xl font-bold text-gray-900">¡Es tu turno!</p>
                {statusData.tableNumber ? (
                  <p className="text-gray-600">Tu mesa es la <span className="font-black text-2xl text-blue-700">#{statusData.tableNumber}</span></p>
                ) : (
                  <p className="text-gray-600">Acercate al ingreso para ser ubicado.</p>
                )}
                {expiresIn !== null && expiresIn > 0 && (
                  <p className="text-red-500 text-sm font-semibold">Tenés {expiresIn}s para ocupar tu lugar</p>
                )}
              </div>
            )}

            {statusData.status === "SEATED" && (
              <div className="space-y-3">
                <CheckCircle size={48} className="text-emerald-500 mx-auto" />
                <p className="text-xl font-bold text-gray-900">¡Bienvenidos!</p>
                {statusData.tableNumber && <p className="text-gray-600">Mesa <span className="font-bold">{statusData.tableNumber}</span></p>}
                <button onClick={leave} className="text-gray-400 text-sm underline">Salir</button>
              </div>
            )}

            {(statusData.status === "EXPIRED" || statusData.status === "CANCELLED") && (
              <div className="space-y-3">
                <XCircle size={48} className="text-red-400 mx-auto" />
                <p className="font-semibold text-gray-700">{statusData.status === "EXPIRED" ? "El tiempo expiró" : "Tu lugar fue cancelado"}</p>
                <button onClick={leave} className="bg-gray-900 text-white font-bold px-5 py-3 rounded-2xl w-full">
                  Volver a anotarse
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
