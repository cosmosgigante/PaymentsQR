import { CartItem, MenuCategory, Order, OrderStatus, Table } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store", // siempre datos frescos; evita que el navegador muestre cambios viejos
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error en la solicitud");
  return data as T;
}

// ─── Cliente (mesa) ───────────────────────────────────────────────────────────

export type MesaData = {
  table: { id: string; number: number; label: string | null };
  restaurant: { name: string; primaryColor: string };
  categories: MenuCategory[];
};

export const getMesaData = (token: string) =>
  request<MesaData>(`/api/mesa-data?token=${token}`);

export const createOrder = (payload: {
  tableToken: string;
  items: CartItem[];
  paymentMode: "ONLINE" | "CASHIER";
  notes?: string;
  customerName?: string;
  customerEmail?: string;
}) =>
  request<Order>("/api/orders", { method: "POST", body: JSON.stringify(payload) });

export const getOrder = (orderId: string, tableToken: string) =>
  request<Order>(`/api/orders/${orderId}?t=${tableToken}`);

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getOrders = (status?: OrderStatus) =>
  request<Order[]>(`/api/orders${status ? `?status=${status}` : ""}`);

export const updateOrderStatus = (orderId: string, status: OrderStatus) =>
  request<Order>(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getMenuCategories = () => request<MenuCategory[]>("/api/menu");

export const createCategory = (name: string) =>
  request<MenuCategory>("/api/menu", { method: "POST", body: JSON.stringify({ name }) });

export const createMenuItem = (payload: {
  categoryId: string; name: string; description?: string; price: number; image?: string;
}) =>
  request("/api/menu/items", { method: "POST", body: JSON.stringify(payload) });

export const updateMenuItem = (id: string, patch: Partial<{ name: string; description: string; price: number; image: string; available: boolean }>) =>
  request("/api/menu/items/" + id, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteMenuItem = (id: string) =>
  request("/api/menu/items/" + id, { method: "DELETE" });

export const getTables = () => request<Table[]>("/api/tables");

export const createTable = (number: number, label?: string) =>
  request<Table>("/api/tables", { method: "POST", body: JSON.stringify({ number, label }) });

export const updateTable = (id: string, patch: Partial<{ isActive: boolean; label: string }>) =>
  request<Table>("/api/tables/" + id, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteTable = (id: string) =>
  request("/api/tables/" + id, { method: "DELETE" });
