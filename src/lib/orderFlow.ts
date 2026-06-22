import { OrderStatus } from "@/lib/types";

// ─── Grupos de estados ──────────────────────────────────────────────────────
// Un solo lugar para definir qué estados pertenecen a cada grupo.
// Si agregás un estado nuevo, actualizá ACÁ y el resto del sistema lo hereda.

export const ALL_STATUSES: OrderStatus[] = [
  "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PREPARING",
  "READY", "DELIVERED", "PAID", "CANCELLED",
];

/** Estados que aparecen en el panel de cocina */
export const KITCHEN_ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

/** Estados que aparecen en el panel de mozos */
export const WAITER_ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

/** Pedidos que todavía no se pagaron (para cobrar con MercadoPago) */
export const UNPAID: OrderStatus[] = ["AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

/** Estados terminales — no se puede volver atrás */
export const TERMINAL: OrderStatus[] = ["PAID", "CANCELLED"];

// ─── Máquina de estados ─────────────────────────────────────────────────────
// Define qué transiciones son válidas desde cada estado.
// Si una transición no está acá, el PATCH la rechaza.

const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  AWAITING_PAYMENT: ["PREPARING", "CANCELLED"],
  PENDING:   ["CONFIRMED", "PREPARING", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY:     ["DELIVERED", "PAID"],
  DELIVERED: ["PAID"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Flujo de cocina ────────────────────────────────────────────────────────
// Dado el estado actual y la config del restaurante, devuelve el siguiente estado.

export function nextKitchenStatus(
  current: OrderStatus,
  flowConfirm: boolean,
): OrderStatus | null {
  if (current === "PENDING") return flowConfirm ? "CONFIRMED" : "PREPARING";
  if (current === "CONFIRMED") return "PREPARING";
  if (current === "PREPARING") return "READY";
  return null;
}

/** Qué dice el botón de cocina según el estado */
export function kitchenActionLabel(
  current: OrderStatus,
  flowConfirm: boolean,
): string | null {
  if (current === "PENDING") return flowConfirm ? "Confirmar recibido" : "En preparación";
  if (current === "CONFIRMED") return "En preparación";
  if (current === "PREPARING") return "Listo 🔔";
  return null;
}

/** Con qué estado arranca un pedido nuevo */
export function initialOrderStatus(paymentMode: string, flowConfirmEnabled: boolean): OrderStatus {
  if (paymentMode === "ONLINE") return "AWAITING_PAYMENT";
  return flowConfirmEnabled ? "PENDING" : "PREPARING";
}
