// ─── Enums y constantes ───────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "PAID"
  | "CANCELLED";

export type PaymentMode = "ONLINE" | "CASHIER";
export type AdminRole  = "OWNER" | "MANAGER" | "STAFF";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:   "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY:     "Listo",
  DELIVERED: "Entregado",
  PAID:      "Pagado",
  CANCELLED: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   "bg-yellow-50 text-yellow-700 border border-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
  PREPARING: "bg-orange-50 text-orange-700 border border-orange-200",
  READY:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  DELIVERED: "bg-zinc-100 text-zinc-500",
  PAID:      "bg-zinc-100 text-zinc-500",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

// ─── Entidades del dominio ────────────────────────────────────────────────────

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available?: boolean;
  sortOrder?: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder?: number;
  items: MenuItem[];
};

export type OrderItem = {
  id?: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  menuItem: { name: string };
};

export type Table = {
  id: string;
  number: number;
  label: string | null;
  qrToken?: string;
  isActive?: boolean;
};

export type Order = {
  id: string;
  status: OrderStatus;
  paymentMode: PaymentMode;
  total: number;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: string;
  table: Table;
  items: OrderItem[];
};

export type RestaurantInfo = {
  name: string;
  primaryColor: string;
};

// ─── Carrito ──────────────────────────────────────────────────────────────────

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};
