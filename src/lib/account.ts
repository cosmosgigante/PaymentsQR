import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getSession, verifyToken } from "@/lib/auth";
import { parseRestaurantIds } from "@/lib/permissions";

type AdminWithAccount = NonNullable<Awaited<ReturnType<typeof loadAdminWithAccount>>>;

function loadAdminWithAccount(where: { email: string } | { id: string }) {
  return db.admin.findUnique({ where, include: { account: true } });
}

export type AccountAccess = { isFull: boolean; allowedRestaurantIds: string[] | null };

/**
 * Alcance de un admin dentro de su cuenta.
 *  - El dueño (ownerEmail) y los socios FULL → acceso total (allowedRestaurantIds = null).
 *  - Los socios RESTRICTED → solo los restoranes de scopeRestaurantIds, sin poderes de cuenta.
 */
export function accountAccess(
  admin: { email: string; accessScope?: string | null; scopeRestaurantIds?: string | null },
  account: { ownerEmail: string }
): AccountAccess {
  const isFull = admin.email === account.ownerEmail || (admin.accessScope ?? "FULL") !== "RESTRICTED";
  return {
    isFull,
    allowedRestaurantIds: isFull ? null : parseRestaurantIds(admin.scopeRestaurantIds),
  };
}

/**
 * Resuelve el "administrador general" en una API route, aceptando las dos vías
 * de login: sesión de Supabase (Google) o el JWT admin_token (email/contraseña).
 * Devuelve { admin, account } o null si no es admin general de ninguna cuenta.
 */
export async function getAccountAdmin(req: NextRequest) {
  // 0) Impersonación: si un superadmin entró a una cuenta ajena, su admin_token tiene
  // impersonating=true y DEBE tener prioridad sobre la sesión Supabase (que sigue siendo
  // la del superadmin, SIN cuenta). Sin esto, las APIs de /cuenta dan 403 al impersonar
  // (ej.: crear restorán a nombre del cliente). Espeja a resolveServerAdmin.
  const token = req.cookies.get("admin_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (payload?.impersonating && payload.adminId) {
    const imp = await loadAdminWithAccount({ id: payload.adminId });
    if (imp?.accountId && imp.account) return { admin: imp, account: imp.account };
  }

  // 1) Sesión Supabase (Google)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  let admin: AdminWithAccount | null = null;
  if (user?.email) {
    admin = await loadAdminWithAccount({ email: user.email.toLowerCase() });
  } else if (payload?.adminId) {
    // 2) Fallback: admin_token JWT (login con email/contraseña)
    admin = await loadAdminWithAccount({ id: payload.adminId });
  }

  if (!admin?.accountId || !admin.account) return null;
  return { admin, account: admin.account };
}

/**
 * Igual que getAccountAdmin pero para Server Components (usa next/headers).
 * Devuelve el Admin (con su account) sin importar la vía de login, o null.
 */
export async function resolveServerAdmin() {
  // Si hay un JWT de impersonación (superadmin entró a cuenta ajena), tiene prioridad
  // sobre la sesión Supabase del superadmin — así /cuenta carga la cuenta impersonada.
  const session = await getSession();
  if (session?.impersonating && session.adminId) {
    return loadAdminWithAccount({ id: session.adminId });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    return loadAdminWithAccount({ email: user.email.toLowerCase() });
  }
  if (session?.adminId) return loadAdminWithAccount({ id: session.adminId });
  return null;
}
