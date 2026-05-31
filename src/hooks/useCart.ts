"use client";

import { useState } from "react";
import { CartItem, MenuItem } from "@/lib/types";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  function add(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  function clear() { setCart([]); }

  const total    = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  return { cart, add, updateQty, clear, total, itemCount };
}
