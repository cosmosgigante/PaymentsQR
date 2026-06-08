"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, CreditCard } from "lucide-react";
import { CartItem } from "@/lib/types";
import { createOrder } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type Props = {
  cart: CartItem[];
  tableToken: string;
  onClose: () => void;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onOrderCreated: (orderId: string) => void;
};

type GoogleUser = { name: string; email: string };

export default function CartDrawer({ cart, tableToken, onClose, onUpdateQty, onOrderCreated }: Props) {
  const [paymentMode, setPaymentMode] = useState<"CASHIER" | "ONLINE">("CASHIER");
  const [notes, setNotes]             = useState("");
  const [googleUser, setGoogleUser]   = useState<GoogleUser | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const total     = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setGoogleUser({
          name:  data.user.user_metadata?.full_name ?? data.user.email,
          email: data.user.email,
        });
      }
    });
  }, []);

  function handleGoogleLogin() {
    const mesaPath = window.location.pathname + window.location.search;
    createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=customer&next=${encodeURIComponent(mesaPath)}`,
      },
    });
  }

  async function handleConfirm() {
    if (paymentMode === "CASHIER" && !googleUser) {
      setError("Iniciá sesión con Google para pagar en caja");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({
        tableToken,
        items: cart,
        paymentMode,
        notes:         notes.trim() || undefined,
        customerName:  googleUser?.name,
        customerEmail: googleUser?.email,
      });
      onOrderCreated(order.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ height: "100dvh" }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/30"
          style={{ WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          className="relative bg-white rounded-t-[28px] flex flex-col shadow-2xl"
          style={{ maxHeight: "92dvh" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-8 h-1 bg-zinc-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-1 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag size={17} className="text-zinc-900" strokeWidth={2} />
              <h2 className="font-bold text-zinc-900 text-lg">Tu pedido</h2>
              <span className="bg-zinc-100 text-zinc-600 text-xs font-semibold px-2 py-0.5 rounded-full">{itemCount}</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200 transition-colors" aria-label="Cerrar">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 overscroll-contain px-5">

            {/* Items */}
            <div className="space-y-3 pb-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 min-h-[48px]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">${item.price.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => onUpdateQty(item.menuItemId, -1)} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center active:bg-zinc-50" aria-label="Quitar">
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-5 text-center font-bold text-sm tabular-nums text-zinc-900">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.menuItemId, 1)} className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white active:bg-zinc-700" aria-label="Agregar">
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-16 text-right font-semibold text-sm text-zinc-900 tabular-nums">${(item.price * item.quantity).toLocaleString("es-AR")}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 my-4" />

            {/* Modo de pago */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">¿Cómo pagás?</p>
              <div className="grid grid-cols-2 gap-2">
                <PaymentOption selected={paymentMode === "CASHIER"} onClick={() => setPaymentMode("CASHIER")} icon="🧾" title="En caja" subtitle="Al terminar de comer" />
                <PaymentOption selected={paymentMode === "ONLINE"}  onClick={() => setPaymentMode("ONLINE")}  icon={<CreditCard size={20} strokeWidth={1.5} />} title="Ahora" subtitle="Tarjeta o billetera" />
              </div>
            </div>

            {/* Google login — solo para pagar en caja */}
            {paymentMode === "CASHIER" && (
              <div className="mb-4">
                {googleUser ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {googleUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-800 text-sm truncate">{googleUser.name}</p>
                      <p className="text-emerald-600 text-xs truncate">{googleUser.email}</p>
                    </div>
                    <span className="text-emerald-500 text-lg">✓</span>
                  </div>
                ) : (
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                    <p className="text-zinc-800 text-sm font-semibold mb-1">Identificate para pagar en caja</p>
                    <p className="text-zinc-400 text-xs mb-3 leading-snug">
                      Para evitar pedidos falsos necesitamos confirmar que sos una persona real.{" "}
                      <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">Ver política de privacidad</a>
                    </p>
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-2.5 bg-white border border-zinc-200 text-zinc-800 font-semibold py-3 rounded-xl text-sm shadow-sm active:bg-zinc-50 transition-all min-h-[48px]"
                    >
                      <GoogleIcon />
                      Continuar con Google
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Aclaraciones */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-2">Aclaraciones</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Sin cebolla, sin gluten..."
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-5 pt-4 border-t border-zinc-100 bg-white" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            {error && <p className="text-red-500 text-xs text-center mb-3 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm text-zinc-500 font-medium">Total</span>
              <span className="text-2xl font-bold text-zinc-900 tracking-tight tabular-nums">${total.toLocaleString("es-AR")}</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading || (paymentMode === "CASHIER" && !googleUser)}
              className="w-full bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-all text-[15px] min-h-[56px]"
            >
              {loading ? "Enviando pedido..." : "Confirmar pedido"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PaymentOption({ selected, onClick, icon, title, subtitle }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button onClick={onClick} className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 min-h-[90px] active:scale-[0.98] ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100 bg-zinc-50 text-zinc-900"}`}>
      <div className={`text-xl mb-2 ${selected ? "text-white" : "text-zinc-700"}`}>{icon}</div>
      <p className="font-semibold text-sm leading-tight">{title}</p>
      <p className={`text-xs mt-0.5 leading-tight ${selected ? "text-zinc-300" : "text-zinc-400"}`}>{subtitle}</p>
    </button>
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
