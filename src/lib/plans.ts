export type PlanType = "MENSUAL" | "TRIMESTRAL" | "ANUAL";
export type PaymentSource = "MANUAL" | "WEB";

/**
 * Planes base. Cada plan incluye 1 restorán/sucursal. Sucursales adicionales
 * se cobran aparte (ver EXTRA_BRANCH_MONTHLY_ARS).
 */
export const PLANS: Record<PlanType, { label: string; months: number; priceArs: number }> = {
  MENSUAL:    { label: "Mensual",    months: 1,  priceArs: 50_000 },
  TRIMESTRAL: { label: "Trimestral", months: 3,  priceArs: 110_000 },
  ANUAL:      { label: "Anual",      months: 12, priceArs: 420_000 },
};

/** Precio mensual por cada sucursal/restorán extra. */
export const EXTRA_BRANCH_MONTHLY_ARS = 30_000;

export function isPlanType(v: unknown): v is PlanType {
  return v === "MENSUAL" || v === "TRIMESTRAL" || v === "ANUAL";
}

/**
 * Calcula precio total, fechas de inicio/fin y meses de un plan.
 * Total = precio base + (sucursales extra × $30.000 × meses del plan).
 */
export function computePlan(planType: PlanType, extraBranches = 0) {
  const plan = PLANS[planType];
  const extras = Math.max(0, Math.floor(extraBranches));
  const totalArs = plan.priceArs + extras * EXTRA_BRANCH_MONTHLY_ARS * plan.months;

  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setMonth(endsAt.getMonth() + plan.months);

  return { plan, extras, totalArs, startedAt, endsAt, months: plan.months };
}

/** Formatea un monto en pesos argentinos: 50000 → "$50.000". */
export function formatArs(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

/** Formatea una fecha como DD/MM/AAAA. */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function paymentSourceLabel(src: PaymentSource | null | undefined): string {
  return src === "WEB" ? "Pago online (web)" : "Registrado manualmente";
}
