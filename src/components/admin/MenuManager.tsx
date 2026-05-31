"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Eye, EyeOff, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

export default function MenuManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", image: "" });
  const [saving, setSaving] = useState(false);

  async function createCategory() {
    if (!newCatName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories((prev) => [...prev, { ...data, items: [] }]);
      setNewCatName("");
      setExpandedCat(data.id);
    }
    setSaving(false);
  }

  async function createItem(categoryId: string) {
    if (!itemForm.name.trim() || !itemForm.price) return;
    setSaving(true);
    const res = await fetch("/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, ...itemForm, price: parseFloat(itemForm.price) }),
    });
    const item = await res.json();
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => c.id === categoryId ? { ...c, items: [...c.items, item] } : c)
      );
      setItemForm({ name: "", description: "", price: "", image: "" });
      setAddingItem(null);
    }
    setSaving(false);
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    const updated = await res.json();
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.map((i) => i.id === updated.id ? updated : i),
        }))
      );
    }
  }

  async function deleteItem(item: MenuItem, categoryId: string) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const res = await fetch(`/api/menu/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) => c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c)
      );
    }
  }

  return (
    <div className="min-h-screen-dvh bg-[#fafafa]">
      {/* Header */}
      <div
        className="bg-white border-b border-zinc-100 px-4 sm:px-5"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3 pb-4">
          <Link
            href="/admin"
            className="w-9 h-9 flex items-center justify-center text-zinc-400 active:text-zinc-700 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <h1 className="font-bold text-zinc-900 text-lg">Menú</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-3">
        {/* Nueva categoría */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Nueva categoría
          </p>
          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              placeholder="Ej: Entradas, Bebidas..."
              className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
            />
            <button
              onClick={createCategory}
              disabled={saving || !newCatName.trim()}
              className="bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[48px] flex-shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              Crear
            </button>
          </div>
        </div>

        {/* Categorías */}
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-zinc-50 transition-colors min-h-[56px]"
            >
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-zinc-900 text-[15px]">{cat.name}</h3>
                <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {cat.items.length}
                </span>
              </div>
              {expandedCat === cat.id
                ? <ChevronUp size={16} className="text-zinc-400 flex-shrink-0" />
                : <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
              }
            </button>

            <AnimatePresence initial={false}>
              {expandedCat === cat.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="border-t border-zinc-50">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50 last:border-0 min-h-[60px]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm leading-snug ${item.available ? "text-zinc-900" : "text-zinc-400 line-through"}`}>
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                            ${item.price.toLocaleString("es-AR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => toggleAvailable(item)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              item.available
                                ? "text-emerald-600 active:bg-emerald-50"
                                : "text-zinc-300 active:bg-zinc-50"
                            }`}
                          >
                            {item.available ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button
                            onClick={() => deleteItem(item, cat.id)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-red-500 active:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Agregar item */}
                    <div className="p-4">
                      {addingItem === cat.id ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={itemForm.name}
                            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            placeholder="Nombre del plato *"
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={itemForm.price}
                              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                              placeholder="Precio *"
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
                            />
                            <input
                              value={itemForm.image}
                              onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                              placeholder="URL imagen"
                              className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
                            />
                          </div>
                          <input
                            value={itemForm.description}
                            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                            placeholder="Descripción"
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setAddingItem(null); setItemForm({ name: "", description: "", price: "", image: "" }); }}
                              className="flex-1 border border-zinc-200 text-zinc-600 py-3 rounded-xl text-sm font-medium active:bg-zinc-50 transition-colors min-h-[48px]"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => createItem(cat.id)}
                              disabled={saving || !itemForm.name || !itemForm.price}
                              className="flex-1 bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px]"
                            >
                              {saving ? "..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingItem(cat.id)}
                          className="w-full border border-dashed border-zinc-200 active:border-zinc-400 text-zinc-400 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          <Plus size={15} strokeWidth={2} />
                          Agregar plato
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <BookOpenIcon />
            <p className="text-sm mt-3">Creá tu primera categoría para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
