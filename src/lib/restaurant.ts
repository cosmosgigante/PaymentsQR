export type RestaurantStatus = {
  isActive: boolean;
  subscriptionEndsAt: Date | string | null;
};

/**
 * (Legacy) Un restaurante está operativo si está activo y su suscripción
 * por-restorán no venció. Se mantiene para compatibilidad con restoranes
 * sin cuenta. La suscripción real ahora vive en Account (ver isAccountActive).
 */
export function isRestaurantActive(r: RestaurantStatus | null | undefined): boolean {
  if (!r || !r.isActive) return false;
  if (r.subscriptionEndsAt == null) return true;
  return new Date(r.subscriptionEndsAt).getTime() > Date.now();
}

export type AccountStatus = {
  isActive: boolean;
  subscriptionEndsAt: Date | string | null;
};

/** Una cuenta está operativa si está activa y su suscripción no venció. */
export function isAccountActive(a: AccountStatus | null | undefined): boolean {
  if (!a || !a.isActive) return false;
  if (a.subscriptionEndsAt == null) return true;
  return new Date(a.subscriptionEndsAt).getTime() > Date.now();
}

/**
 * Un restorán está operativo (los clientes pueden ver el menú y pedir) si:
 *  - el restorán está activo (no apagado por el dueño) y habilitado (status ACTIVE), y
 *  - su cuenta está activa y con la suscripción vigente.
 *
 * Si el restorán no tiene cuenta (caso legacy), cae al chequeo viejo por restorán
 * para no romper restoranes preexistentes.
 */
export function isRestaurantOperative(
  restaurant: { isActive: boolean; status?: string | null; subscriptionEndsAt?: Date | string | null },
  account: AccountStatus | null | undefined
): boolean {
  if (!restaurant.isActive) return false;
  if (restaurant.status && restaurant.status !== "ACTIVE") return false;
  if (account) return isAccountActive(account);
  return isRestaurantActive({ isActive: restaurant.isActive, subscriptionEndsAt: restaurant.subscriptionEndsAt ?? null });
}
