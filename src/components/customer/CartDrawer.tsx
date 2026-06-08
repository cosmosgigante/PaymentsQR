"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, CreditCard, User, Phone } from "lucide-react";
import { CartItem } from "@/lib/types";
import { createOrder } from "@/lib/api";

type Props = {
  cart: CartItem[];
  tableToken: string;
  onClose: () => void;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onOrderCreated: (orderId: string) => void;
};

export default function CartDrawer({ cart, tableToken, onClose, onUpdateQty, onOrderCreated }: Props) {
  const [paymentMode, setPaymentMode] = useState<"CASHIER" | "ONLINE">("CASHIER");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function handleConfirm() {
    if (paymentMode === "CASHIER") {
      if (!customerName.trim()) { setError("Ingresá tu nombre para continuar"); return; }
      if (!customerPhone.trim()) { setError("Ingresá tu teléfono para continuar"); return; }
    }
    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({
        tableToken,
        items: cart,
        paymentMode,
        notes: notes.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
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
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/30"
          style={{ WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
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
              <span className="bg-zinc-100 text-zinc-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Contenido scrollable */}
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
                    <button onClick={() => onUpdateQty(item.menuItemId, -1)}
                      className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center active:bg-zinc-50 transition-colors" aria-label="Quitar">
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-5 text-center font-bold text-sm tabular-nums text-zinc-900">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.menuItemId, 1)}
                      className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white active:bg-zinc-700 transition-colors" aria-label="Agregar">
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-16 text-right font-semibold text-sm text-zinc-900 tabular-nums">
                      ${(item.price * item.quantity).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 my-4" />

            {/* Modo de pago */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                ¿Cómo pagás?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PaymentOption
                  selected={paymentMode === "CASHIER"}
                  onClick={() => setPaymentMode("CASHIER")}
                  icon="🧾"
                  title="En caja"
                  subtitle="Al terminar de comer"
                />
                <PaymentOption
                  selected={paymentMode === "ONLINE"}
                  onClick={() => setPaymentMode("ONLINE")}
                  icon={<CreditCard size={20} strokeWidth={1.5} />}
                  title="Ahora"
                  subtitle="Tarjeta o billetera"
                />
              </div>
            </div>

            {/* Datos solo para pago en caja */}
            {paymentMode === "CASHIER" && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Tus datos
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" strokeWidth={2} />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre y apellido"
                      autoComplete="name"
                      maxLength={100}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-9 pr-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300"
                    />
                  </div>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" strokeWidth={2} />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono (ej: 11 1234-5678)"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={30}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-9 pr-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug px-1">
                    Para evitar pedidos falsos al pagar en caja.{" "}
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      Política de privacidad
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Aclaraciones */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-2">
                Aclaraciones
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sin cebolla, sin gluten..."
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300"
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex-shrink-0 px-5 pt-4 border-t border-zinc-100 bg-white"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            {error && (
              <p className="text-red-500 text-xs text-center mb-3 bg-red-50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm text-zinc-500 font-medium">Total</span>
              <span className="text-2xl font-bold text-zinc-900 tracking-tight tabular-nums">
                ${total.toLocaleString("es-AR")}
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-zinc-900 active:bg-zinc-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all text-[15px] min-h-[56px]"
            >
              {loading ? "Enviando pedido..." : "Confirmar pedido"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PaymentOption({
  selected, onClick, icon, title, subtitle,
}: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 min-h-[90px] active:scale-[0.98] ${
        selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100 bg-zinc-50 text-zinc-900 active:border-zinc-300"
      }`}
    >
      <div className={`text-xl mb-2 ${selected ? "text-white" : "text-zinc-700"}`}>{icon}</div>
      <p className="font-semibold text-sm leading-tight">{title}</p>
      <p className={`text-xs mt-0.5 leading-tight ${selected ? "text-zinc-300" : "text-zinc-400"}`}>{subtitle}</p>
    </button>
  );
}
