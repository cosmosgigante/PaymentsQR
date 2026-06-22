"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderData = {
  id: string;
  restaurant: string;
  table: number;
  status: string;
  total: number;
  paymentMode: string;
  items: string[];
  notes: string | null;
  date: string;
};

type DataResponse = { email: string; totalOrders: number; orders: OrderData[] };
type DeleteResponse = { ok: boolean; message: string; count: number };

export default function MisDatosPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataResponse | null>(null);
  const [deleted, setDeleted] = useState<DeleteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function ensureGoogleSession() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/mis-datos` },
    });
    return !error;
  }

  async function fetchData() {
    setLoading(true); setError(null); setData(null); setDeleted(null);
    const ok = await ensureGoogleSession();
    if (!ok) { setError("No se pudo iniciar sesión con Google"); setLoading(false); return; }
    const res = await fetch("/api/mis-datos");
    if (!res.ok) { setError("Iniciá sesión con Google primero"); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }

  async function deleteData() {
    setLoading(true); setError(null);
    const res = await fetch("/api/mis-datos", { method: "DELETE" });
    if (!res.ok) { setError("Error al eliminar datos"); setLoading(false); return; }
    setDeleted(await res.json());
    setData(null);
    setConfirmDelete(false);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <div className="max-w-2xl mx-auto">
          <Link href="/privacidad" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3">
            <ArrowLeft size={16} /> Privacidad
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-white/80" />
            <h1 className="text-white font-bold text-2xl">Mis datos personales</h1>
          </div>
          <p className="text-white/50 text-sm">Ley 25.326 — Derechos ARCO. Consultá o eliminá tus datos del sistema.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {!data && !deleted && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
            <p className="text-gray-600 text-sm">Para ver o eliminar tus datos, necesitamos verificar tu identidad con Google.</p>
            <button onClick={fetchData} disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Verificando..." : "Ver mis datos"}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {deleted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-6 text-center">
            <ShieldCheck size={32} className="mx-auto mb-2 text-emerald-500" />
            <p className="font-bold text-lg">{deleted.message}</p>
            <p className="text-sm mt-2 text-emerald-600">Los pedidos se conservan sin datos personales para estadísticas del restaurante.</p>
          </div>
        )}

        {data && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Tu email</p>
              <p className="text-gray-900 font-semibold">{data.email}</p>
              <p className="text-gray-400 text-sm mt-1">{data.totalOrders} pedido(s) registrados</p>
            </div>

            {data.orders.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Historial de pedidos</p>
                </div>
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {data.orders.map((o) => (
                    <div key={o.id} className="px-5 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{o.restaurant} — Mesa {o.table}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(o.date).toLocaleDateString("es-AR")} · {o.status} · {o.paymentMode === "ONLINE" ? "Online" : "Caja"}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">${o.total.toLocaleString("es-AR")}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{o.items.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.totalOrders === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">No tenemos datos personales asociados a este email.</p>
              </div>
            )}

            {data.totalOrders > 0 && (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 size={16} className="text-red-500" />
                  <p className="font-bold text-gray-900 text-sm">Eliminar mis datos</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">Se anonimizarán tu nombre, email y notas de todos tus pedidos. Los pedidos se conservan sin datos personales para las estadísticas del restaurante. Esta acción no se puede deshacer.</p>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="text-sm font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all">
                    Quiero eliminar mis datos
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={deleteData} disabled={loading}
                      className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-xl transition-all">
                      {loading ? "Eliminando..." : "Confirmar eliminación"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
