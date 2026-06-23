"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X, Minus, Plus, Clock, CheckCircle2, CreditCard } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { createClient } from "@/lib/supabase/client";
import MenuView from "@/components/customer/MenuView";
import { MenuCategory } from "@/lib/types";

type Props = { slug: string; restaurantName: string; primaryColor: string; categories: MenuCategory[] };
type Tracked = { status: string; code: string; total: number; name: string | null; position: number };

const STORAGE_KEY = (slug: string) => `pqr_tienda_${slug}`;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pedido recibido", CONFIRMED: "Confirmado", PREPARING: "Preparando",
  READY: "¡Listo para retirar!", DELIVERED: "Entregado", PAID: "Entregado", CANCELLED: "Cancelado",
};

export default function TiendaClient({ slug, restaurantName, primaryColor, categories }: Props) {
  const { cart, add, updateQty, clear, total, itemCount } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payMode, setPayMode] = useState<"PICKUP" | "ONLINE">("PICKUP");
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Tracked | null>(null);

  // Restaurar seguimiento si ya había un pedido
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(slug));
      if (saved) setOrderId(saved);
    } catch { /* ignore */ }
  }, [slug]);

  // Identidad Google (para "pagar al retirar") + reabrir carrito al volver del login
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setGoogleUser({ name: data.user.user_metadata?.full_name ?? data.user.email, email: data.user.email });
    });
    try {
      if (localStorage.getItem("pqr_reopen_cart")) { localStorage.removeItem("pqr_reopen_cart"); setSheetOpen(true); }
    } catch { /* ignore */ }
  }, []);

  function loginGoogle() {
    const path = window.location.pathname + window.location.search;
    document.cookie = `pqr_return=${encodeURIComponent(path)}; path=/; max-age=300; samesite=lax`;
    try { localStorage.setItem("pqr_reopen_cart", "1"); } catch { /* ignore */ }
    createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
  }

  const poll = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/tienda/order?id=${id}`);
      if (r.ok) setTracked(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    poll(orderId);
    const t = setInterval(() => poll(orderId), 5000);
    return () => clearInterval(t);
  }, [orderId, poll]);

  async function sendOrder() {
    if (!googleUser) { setError("Iniciá sesión con Google para pagar al retirar"); return; }
    setSending(true); setError(null);
    try {
      const r = await fetch("/api/tienda/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, items: cart, name: googleUser.name, email: googleUser.email }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo enviar el pedido"); setSending(false); return; }
      localStorage.setItem(STORAGE_KEY(slug), d.id);
      setOrderId(d.id);
      setTracked({ status: "PENDING", code: d.code, total: d.total, name: googleUser.name, position: d.position });
      clear(); setSheetOpen(false);
    } catch { setError("Error de red"); }
    setSending(false);
  }

  function nuevoPedido() {
    try { localStorage.removeItem(STORAGE_KEY(slug)); } catch { /* ignore */ }
    setOrderId(null); setTracked(null);
  }

  // ---- Pantalla de seguimiento ----
  if (orderId && tracked) {
    const ready = tracked.status === "READY";
    const done = tracked.status === "DELIVERED" || tracked.status === "PAID";
    const cancelled = tracked.status === "CANCELLED";
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5"
        style={{ background: `linear-gradient(160deg, ${primaryColor}18 0%, #fafafa 60%)` }}>
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-zinc-100 p-6 text-center">
          <p className="text-zinc-400 text-xs uppercase tracking-widest">{restaurantName}</p>
          <p className="text-zinc-500 text-sm mt-4">Tu número de retiro</p>
          <p className="text-5xl font-black tracking-tight mt-1" style={{ color: primaryColor }}>#{tracked.code}</p>

          {ready ? (
            <div className="mt-5">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-lg text-zinc-900">¡Listo para retirar!</p>
              <p className="text-zinc-500 text-sm mt-1">Mostrá el <span className="font-bold">#{tracked.code}</span> en el mostrador.</p>
            </div>
          ) : done ? (
            <div className="mt-5">
              <CheckCircle2 size={40} className="text-zinc-400 mx-auto mb-2" />
              <p className="font-semibold text-zinc-700">Pedido entregado</p>
            </div>
          ) : cancelled ? (
            <div className="mt-5">
              <X size={40} className="text-red-400 mx-auto mb-2" />
              <p className="font-semibold text-zinc-700">Pedido cancelado</p>
            </div>
          ) : (
            <div className="mt-5">
              {tracked.position > 1 ? (
                <>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${primaryColor}1e` }}>
                    <span className="text-2xl font-black" style={{ color: primaryColor }}>{tracked.position}</span>
                  </div>
                  <p className="text-zinc-600 text-sm">Hay <b>{tracked.position - 1}</b> {tracked.position - 1 === 1 ? "pedido" : "pedidos"} antes del tuyo</p>
                </>
              ) : (
                <p className="font-semibold text-zinc-800">Sos el próximo 🙌</p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mt-2">
                <Clock size={13} /><span>{STATUS_LABEL[tracked.status] ?? tracked.status}</span>
              </div>
              <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin mx-auto mt-4" />
              <p className="text-zinc-300 text-[11px] mt-2">Se actualiza solo</p>
            </div>
          )}

          <div className="border-t border-zinc-100 mt-5 pt-4 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total a pagar al retirar</span>
            <span className="font-bold text-zinc-900">${tracked.total.toLocaleString("es-AR")}</span>
          </div>
          {(ready || done || cancelled) && (
            <button onClick={nuevoPedido} className="mt-4 w-full bg-zinc-900 text-white font-bold py-3 rounded-2xl active:bg-zinc-700">
              Hacer otro pedido
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Catálogo + carrito ----
  return (
    <div className="relative">
      <MenuView
        categories={categories}
        restaurantName={restaurantName}
        tableLabel="🏪 Pedí y retirá"
        cart={cart}
        onAdd={add}
        onRemove={(id) => updateQty(id, -1)}
      />

      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="w-full max-w-[430px]">
              <button onClick={() => setSheetOpen(true)}
                className="w-full text-white font-semibold py-4 px-5 rounded-2xl shadow-xl flex items-center justify-between min-h-[56px]"
                style={{ backgroundColor: primaryColor }}>
                <div className="flex items-center gap-2.5">
                  <ShoppingBag size={16} />
                  <span className="text-[15px]">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                </div>
                <span className="font-bold text-[15px] tabular-nums">${total.toLocaleString("es-AR")} ›</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ height: "100dvh" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30" onClick={() => setSheetOpen(false)} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="relative bg-white rounded-t-[28px] flex flex-col shadow-2xl" style={{ maxHeight: "90dvh" }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-8 h-1 bg-zinc-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <h2 className="font-bold text-zinc-900 text-lg">Tu pedido</h2>
              <button onClick={() => setSheetOpen(false)} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-zinc-400">${item.price.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <button onClick={() => updateQty(item.menuItemId, -1)} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center"><Minus size={13} /></button>
                  <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menuItemId, 1)} className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Plus size={13} /></button>
                  <span className="w-16 text-right font-semibold text-sm tabular-nums">${(item.price * item.quantity).toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">¿Cómo pagás?</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button" onClick={() => setPayMode("PICKUP")}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${payMode === "PICKUP" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-800"}`}>
                    <span className="text-lg">🧾</span>
                    <p className="font-semibold text-sm mt-1">Al retirar</p>
                    <p className={`text-[11px] ${payMode === "PICKUP" ? "text-zinc-300" : "text-zinc-400"}`}>Con tu cuenta</p>
                  </button>
                  <button type="button" onClick={() => setError("El pago online estará disponible pronto 🙌")}
                    className="p-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 text-left">
                    <CreditCard size={20} strokeWidth={1.5} />
                    <p className="font-semibold text-sm mt-1">Ahora</p>
                    <p className="text-[11px]">Próximamente</p>
                  </button>
                </div>

                {googleUser ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{googleUser.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-800 text-sm truncate">{googleUser.name}</p>
                      <p className="text-emerald-600 text-xs truncate">{googleUser.email}</p>
                    </div>
                    <span className="text-emerald-500 text-lg">✓</span>
                  </div>
                ) : (
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                    <p className="text-zinc-800 text-sm font-semibold mb-1">Identificate para pagar al retirar</p>
                    <p className="text-zinc-400 text-xs mb-3 leading-snug">Así te llamamos por tu nombre y evitamos pedidos falsos.</p>
                    <button onClick={loginGoogle} className="w-full flex items-center justify-center gap-2.5 bg-white border border-zinc-200 text-zinc-800 font-semibold py-3 rounded-xl text-sm shadow-sm active:bg-zinc-50 min-h-[48px]">
                      <GoogleIcon /> Continuar con Google
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 pt-4 border-t border-zinc-100" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              {error && <p className="text-red-500 text-xs text-center mb-3 bg-red-50 rounded-lg py-2">{error}</p>}
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm text-zinc-500">Total (pagás al retirar)</span>
                <span className="text-2xl font-bold text-zinc-900 tabular-nums">${total.toLocaleString("es-AR")}</span>
              </div>
              <button onClick={sendOrder} disabled={sending || itemCount === 0 || !googleUser}
                className="w-full text-white font-bold py-4 rounded-2xl text-[15px] disabled:opacity-50 min-h-[56px]"
                style={{ backgroundColor: primaryColor }}>
                {sending ? "Enviando..." : googleUser ? "Enviar pedido" : "Iniciá sesión para pedir"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
