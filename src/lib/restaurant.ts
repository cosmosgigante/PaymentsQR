export type RestaurantStatus = {
  isActive: boolean;
  subscriptionEndsAt: Date | string | null;
};

/**
 * Un restaurante está operativo si:
 *  - no fue suspendido manualmente por el superadmin (isActive), y
 *  - su suscripción no venció.
 *
 * Una suscripción nula significa "sin vencimiento" (cuenta gratis / grandfathered):
 * en ese caso solo la gobierna isActive. El superadmin "activa" el cobro al
 * ponerle una fecha de vencimiento desde el panel.
 */
export function isRestaurantActive(r: RestaurantStatus | null | undefined): boolean {
  if (!r || !r.isActive) return false;
  if (r.subscriptionEndsAt == null) return true;
  return new Date(r.subscriptionEndsAt).getTime() > Date.now();
}
