"use client";

import { useState, useEffect } from "react";
import { CartItem, MenuItem } from "@/lib/types";

const CART_KEY = "pqr_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch { return []; }
}

function saveCart(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* ignore */ }
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Carga inicial desde localStorage (una sola vez al montar)
  useEffect(() => { setCart(loadCart()); }, []);

  function update(updater: (prev: CartItem[]) => CartItem[]) {
    setCart((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }

  function add(item: MenuItem) {
    update((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    update((prev) =>
      prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  function clear() { update(() => []); }

  const total     = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  return { cart, add, updateQty, clear, total, itemCount };
}
