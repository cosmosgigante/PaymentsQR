"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

import { getMesaData, MesaData } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import MobileFrame from "@/components/customer/MobileFrame";
import MenuView from "@/components/customer/MenuView";
import CartDrawer from "@/components/customer/CartDrawer";
import OrderStatusView from "@/components/customer/OrderStatus";

export default function MesaPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]       = useState<MesaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderId, setOrderId]   = useState<string | null>(null);

  const { cart, add, updateQty, clear, total, itemCount } = useCart();

  useEffect(() => {
    getMesaData(token)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <MobileFrame>
        <div className="min-h-screen-dvh flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileFrame>
    );
  }

  if (error || !data) {
    return (
      <MobileFrame>
        <div className="min-h-screen-dvh flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Mesa no encontrada</h2>
            <p className="text-zinc-400 text-sm">{error}</p>
          </div>
        </div>
      </MobileFrame>
    );
  }

  if (orderId) {
    return (
      <MobileFrame>
        <OrderStatusView orderId={orderId} tableToken={token} />
      </MobileFrame>
    );
  }

  const tableLabel = data.table.label ?? `Mesa ${data.table.number}`;

  return (
    <MobileFrame>
      <div className="relative">
        <MenuView
          categories={data.categories}
          restaurantName={data.restaurant.name}
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
              {/* Contenedor que respeta el frame en desktop */}
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
            onOrderCreated={(id) => {
              setOrderId(id);
              setCartOpen(false);
              clear();
            }}
          />
        )}
      </div>
    </MobileFrame>
  );
}
