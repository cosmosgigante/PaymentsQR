"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { CartItem, MenuCategory, MenuItem } from "@/lib/types";

type Props = {
  categories: MenuCategory[];
  restaurantName: string;
  tableLabel: string;
  cart: CartItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (menuItemId: string) => void;
};

export default function MenuView({ categories, restaurantName, tableLabel, cart, onAdd, onRemove }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);
  const cartMap = new Map(cart.map((c) => [c.menuItemId, c.quantity]));

  const currentCategory = categories.find((c) => c.id === activeCategory) ?? categories[0];

  function selectCategory(id: string) {
    setActiveCategory(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Scroll la tab activa al centro
    const tabEl = tabsRef.current?.querySelector(`[data-cat="${id}"]`) as HTMLElement | null;
    tabEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  return (
    <div className="bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
        <p className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase mb-0.5">{tableLabel}</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 leading-tight">{restaurantName}</h1>
      </div>

      {/* Tabs sticky */}
      <div
        className="sticky top-0 z-40 bg-white/80 border-b border-zinc-100"
        style={{ WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}
      >
        <div ref={tabsRef} className="flex gap-1 px-3 py-2.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`relative whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors min-h-[36px] ${
                activeCategory === cat.id ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {activeCategory === cat.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-zinc-100 rounded-full"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
                />
              )}
              <span className="relative z-10">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items — solo muestra la categoría activa */}
      <div className="px-4 py-5 space-y-2 max-w-lg mx-auto">
        {(currentCategory?.items ?? []).map((item, idx) => {
                const qty = cartMap.get(item.id) ?? 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.2), duration: 0.2 }}
                    className="bg-white rounded-2xl border border-zinc-100 overflow-hidden"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full aspect-video object-cover"
                      />
                    )}
                    <div className="p-3.5 flex gap-3 items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 text-[15px] leading-snug">{item.name}</p>
                        {item.description && (
                          <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        )}
                        <p className="text-zinc-900 font-bold text-sm mt-1.5">
                          ${item.price.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <AnimatePresence mode="wait" initial={false}>
                          {qty === 0 ? (
                            <motion.button key="add"
                              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              onClick={() => onAdd(item)}
                              className="w-10 h-10 bg-zinc-900 active:bg-zinc-700 text-white rounded-full flex items-center justify-center"
                              aria-label={`Agregar ${item.name}`}
                            >
                              <Plus size={18} strokeWidth={2.5} />
                            </motion.button>
                          ) : (
                            <motion.div key="counter"
                              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              className="flex items-center gap-1.5"
                            >
                              <button onClick={() => onRemove(item.id)}
                                className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 active:bg-zinc-50"
                                aria-label="Quitar uno">
                                <Minus size={14} strokeWidth={2.5} />
                              </button>
                              <span className="w-5 text-center font-bold text-zinc-900 text-sm tabular-nums">{qty}</span>
                              <button onClick={() => onAdd(item)}
                                className="w-9 h-9 rounded-full bg-zinc-900 active:bg-zinc-700 flex items-center justify-center text-white"
                                aria-label="Agregar uno">
                                <Plus size={14} strokeWidth={2.5} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
        })}
        <div className="h-24" />
      </div>
    </div>
  );
}
