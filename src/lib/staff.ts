import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { signToken, type AdminPayload } from "@/lib/auth";
import { parsePermissions, parseRestaurantIds, type PermLevel, type ModuleKey } from "@/lib/permissions";
import { isRestaurantOperative } from "@/lib/restaurant";
import { logActivity } from "@/lib/activity";

function getSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) throw new Error("JWT_SECRET no configurado");
  return new TextEncoder().encode(raw);
}

const LEVEL_RANK: Record<string, number> = { NONE: 0, VIEW: 1, MANAGE: 2 };

/**
 * ¿La sesión puede acceder a un módulo con cierto nivel?
 * Dueños/admins/superadmin (role !== STAFF) tienen acceso total.
 * El personal (STAFF) se rige por su matriz de permisos.
 */
export function canAccess(
  session: { role: string; permissions?: Record<string, string> } | null | undefined,
  module: ModuleKey,
  level: PermLevel = "VIEW"
): boolean {
  if (!session) return false;
  if (session.role !== "STAFF") return true;
  const have = session.permissions?.[module] ?? "NONE";
  return (LEVEL_RANK[have] ?? 0) >= (LEVEL_RANK[level] ?? 0);
}

/**
 * ¿La sesión puede GESTIONAR (modificar) en alguno de estos módulos?
 * Dueños/admins → sí. Personal → necesita nivel MANAGE en al menos uno.
 * Se usa en las APIs de mutación para que "Ver" sea solo lectura.
 */
export function canManageAny(
  session: { role: string; permissions?: Record<string, string> } | null | undefined,
  modules: ModuleKey[]
): boolean {
  if (!session) return false;
  if (session.role !== "STAFF") return true;
  return modules.some((m) => (session.permissions?.[m] ?? "NONE") === "MANAGE");
}

/** Módulos con página propia, para el panel de trabajo del personal. */
export const STAFF_MODULES: { key: ModuleKey; label: string; href: string; emoji: string }[] = [
  { key: "COCINA", label: "Cocina", href: "/cocina",      emoji: "👨‍🍳" },
  { key: "MOZOS",  label: "Mozos",  href: "/mozos",       emoji: "🍽️" },
  { key: "MENU",   label: "Menú",   href: "/admin/menu",  emoji: "📖" },
  { key: "MESAS",  label: "Mesas",  href: "/admin/mesas", emoji: "🔳" },
];

// ── Token "pendiente" entre el login y la selección de restorán ──────────────
type StaffPending = { kind: "password" | "google"; tokenId?: string; email?: string };

export async function signStaffPending(p: StaffPending): Promise<string> {
  return new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(getSecret());
}
export async function verifyStaffPending(token: string): Promise<StaffPending | null> {
  try { const { payload } = await jwtVerify(token, getSecret()); return payload as unknown as StaffPending; }
  catch { return null; }
}

export function isTokenUsable(token: { isActive: boolean; expiresAt: Date | null }): boolean {
  if (!token.isActive) return false;
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return false;
  return true;
}

/** Restoranes operativos (cuenta activa + restorán habilitado) asignados a un token. */
export async function operativeRestaurantsForToken(token: { restaurantIds: string }) {
  const ids = parseRestaurantIds(token.restaurantIds);
  if (ids.length === 0) return [] as { id: string; name: string }[];
  const restos = await db.restaurant.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, name: true, isActive: true, status: true,
      account: { select: { isActive: true, subscriptionEndsAt: true } },
    },
  });
  return restos.filter((r) => isRestaurantOperative(r, r.account)).map((r) => ({ id: r.id, name: r.name }));
}

/**
 * Crea la sesión del personal para un restorán: respeta el límite de
 * dispositivos (si está lleno, expulsa la sesión más vieja) y devuelve el JWT
 * para la cookie admin_token.
 */
export async function createStaffSession(
  token: { id: string; accountId: string; name: string; maxDevices: number; permissions: string },
  restaurantId: string
): Promise<string> {
  const count = await db.accessSession.count({ where: { tokenId: token.id } });
  if (count >= token.maxDevices) {
    const oldest = await db.accessSession.findFirst({
      where: { tokenId: token.id }, orderBy: { lastSeenAt: "asc" }, select: { id: true },
    });
    if (oldest) await db.accessSession.delete({ where: { id: oldest.id } });
  }
  const ses = await db.accessSession.create({ data: { tokenId: token.id } });

  await logActivity({
    accountId: token.accountId, restaurantId, actorType: "STAFF", actorName: token.name,
    category: "PERSONAL", action: "LOGIN", detail: `${token.name} inició sesión`,
  });

  const payload: AdminPayload = {
    adminId: "",
    restaurantId,
    role: "STAFF",
    accountId: token.accountId,
    actorName: token.name,
    staffTokenId: token.id,
    staffSessionId: ses.id,
    permissions: parsePermissions(token.permissions),
  };
  return signToken(payload);
}
