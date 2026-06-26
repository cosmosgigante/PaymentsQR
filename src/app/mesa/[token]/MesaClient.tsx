"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Users } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import MenuView from "@/components/customer/MenuView";
import CartDrawer from "@/components/customer/CartDrawer";
import OrderStatusView from "@/components/customer/OrderStatus";
import { MenuCategory, OrderStatus as Status } from "@/lib/types";

type Props = {
  token: string;
  table: { id: string; number: number; label: string | null };
  restaurant: { name: string; primaryColor: string };
  categories: MenuCategory[];
};

export type SessionOrder = {
  id: string;
  status: Status;
  paymentMode: string;
  total: number;
  table: { number: number; label: string | null };
  items: { quantity: number; unitPrice: number; notes: string | null; menuItem: { name: string } }[];
  createdAt: string;
  mine?: boolean;
  dinerIndex?: number;
};

export default function MesaClient({ token, table, restaurant, categories }: Props) {
  const [cartOpen, setCartOpen]   = useState(false);
  const [phase, setPhase]         = useState<"loading" | "full" | "ready">("loading");
  const [maxDevices, setMaxDevices] = useState(2);
  const [orders, setOrders]       = useState<SessionOrder[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [payEnabled, setPayEnabled] = useState(false);
  const [multiDiner, setMultiDiner] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [forceMenu, setForceMenu] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { cart, add, updateQty, clear, total, itemCount } = useCart();

  // Resuelve la sesión de mesa en el backend: une este dispositivo (aplicando el
  // límite por mesa) y trae el historial real de pedidos de la sesión.
  const loadSession = useCallback(async () => {
    try {
      const r = await fetch("/api/mesa/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken: token }),
      });
      const d = await r.json();
      if (d?.full) { setMaxDevices(d.maxDevices ?? 2); setPhase("full"); return; }
      if (d?.ok) {
        setOrders(Array.isArray(d.orders) ? d.orders : []);
        setPendingConfirm(d.session?.status === "PENDING_CONFIRM");
        setPayEnabled(!!d.payEnabled);
        setMultiDiner(!!d.multiDiner);
        setPaymentPending(!!d.paymentPending);
      }
      setPhase("ready");
    } catch {
      setPhase("ready"); // ante un fallo de red no bloqueamos el pedido
    }
  }, [token]);

  useEffect(() => {
    loadSession();
    // Al volver del login de Google reabrimos el carrito (round-trip de página completa).
    try {
      if (localStorage.getItem("pqr_reopen_cart")) {
        localStorage.removeItem("pqr_reopen_cart");
        setCartOpen(true);
      }
      // Saludo de bienvenida solo la primera vez que se escanea esta mesa.
      if (!localStorage.getItem(`pqr_welcome_${token}`)) setShowWelcome(true);
    } catch { /* ignore */ }
    // Refresco liviano: estado de confirmación de la mesa e historial en vivo.
    const poll = setInterval(loadSession, 15000);
    return () => clearInterval(poll);
  }, [loadSession]);

  function handleOrderCreated() {
    setCartOpen(false);
    clear();
    setForceMenu(false);
    loadSession(); // refresca historial y muestra el estado del nuevo pedido
  }

  function pedirMas() { setForceMenu(true); }

  function dismissWelcome() {
    try { localStorage.setItem(`pqr_welcome_${token}`, "1"); } catch { /* ignore */ }
    setShowWelcome(false);
  }

  const tableLabel = table.label ?? `Mesa ${table.number}`;
  const currentOrder = orders.length ? orders[orders.length - 1] : null;

  if (phase === "loading") {
    return (
      <div className="min-h-screen-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "full") {
    return (
      <div className="min-h-screen-dvh flex items-center justify-center bg-[#fafafa] px-6 text-center">
        <div className="max-w-xs">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mx-auto mb-4">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Mesa en uso</h1>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Esta mesa ya tiene {maxDevices} {maxDevices === 1 ? "dispositivo conectado" : "dispositivos conectados"}.
            Pedí desde uno de los celulares que ya está usando la mesa, o avisá al personal.
          </p>
        </div>
      </div>
    );
  }

  if (currentOrder && !forceMenu) {
    return (
      <OrderStatusView
        orderId={currentOrder.id}
        tableToken={token}
        onPedirMas={pedirMas}
        sessionOrders={orders}
        pendingConfirm={pendingConfirm}
        payEnabled={payEnabled}
        multiDiner={multiDiner}
        paymentPending={paymentPending}
      />
    );
  }

  if (showWelcome && !currentOrder) {
    return (
      <div className="min-h-screen-dvh flex flex-col items-center justify-center px-6 text-center"
        style={{ background: `linear-gradient(160deg, ${restaurant.primaryColor}1f, #ffffff 65%)`, paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="max-w-xs w-full">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-zinc-900">¡Hola!</h1>
          <p className="text-zinc-600 mt-2 leading-relaxed">
            Estás en <span className="font-semibold">{tableLabel}</span> de{" "}
            <span className="font-bold" style={{ color: restaurant.primaryColor }}>{restaurant.name}</span>.
          </p>
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
            Mirá el menú y pedí desde tu celular. Podés pagar en la caja o desde acá, cuando termines.
          </p>
          <button onClick={dismissWelcome}
            className="mt-7 w-full text-white font-bold py-4 rounded-2xl text-[15px] min-h-[56px] transition-all active:opacity-90 shadow-lg"
            style={{ backgroundColor: restaurant.primaryColor }}>
            Ver el menú y pedir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {pendingConfirm && (
        <div className="sticky top-0 z-40 bg-amber-500 text-white text-center text-sm font-semibold py-2.5 px-4"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}>
          ⏳ Esperando que el mozo confirme tu mesa
        </div>
      )}
      <MenuView
        categories={categories}
        restaurantName={restaurant.name}
        tableLabel={tableLabel}
        cart={cart}
        onAdd={add}
        onRemove={(id) => updateQty(id, -1)}
      />

      {/* FAB carrito */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="w-full max-w-[430px]">
              <button
                onClick={() => setCartOpen(true)}
                className="w-full bg-zinc-900 active:bg-zinc-700 text-white font-semibold py-4 px-5 rounded-2xl shadow-xl flex items-center justify-between transition-colors min-h-[56px]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/10 rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={15} strokeWidth={2} />
                  </div>
                  <span className="text-[15px]">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[15px] tabular-nums">
                    ${total.toLocaleString("es-AR")}
                  </span>
                  <span className="text-zinc-400 ml-1">›</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cartOpen && (
        <CartDrawer
          cart={cart}
          tableToken={token}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onOrderCreated={handleOrderCreated}
        />
      )}
    </div>
  );
}
