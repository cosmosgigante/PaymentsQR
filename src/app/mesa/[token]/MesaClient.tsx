"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import MenuView from "@/components/customer/MenuView";
import CartDrawer from "@/components/customer/CartDrawer";
import OrderStatusView from "@/components/customer/OrderStatus";
import { MenuCategory } from "@/lib/types";

type Props = {
  token: string;
  table: { id: string; number: number; label: string | null };
  restaurant: { name: string; primaryColor: string };
  categories: MenuCategory[];
};

export default function MesaClient({ token, table, restaurant, categories }: Props) {
  const [cartOpen, setCartOpen] = useState(false);
  const [orderId, setOrderId]   = useState<string | null>(null);
  const { cart, add, updateQty, clear, total, itemCount } = useCart();

  const tableLabel = table.label ?? `Mesa ${table.number}`;

  if (orderId) {
    return <OrderStatusView orderId={orderId} tableToken={token} />;
  }

  return (
    <div className="relative">
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
          onOrderCreated={(id) => {
            setOrderId(id);
            setCartOpen(false);
            clear();
          }}
        />
      )}
    </div>
  );
}
