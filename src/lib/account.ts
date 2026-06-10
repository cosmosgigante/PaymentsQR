import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getSession, verifyToken } from "@/lib/auth";

type AdminWithAccount = NonNullable<Awaited<ReturnType<typeof loadAdminWithAccount>>>;

function loadAdminWithAccount(where: { email: string } | { id: string }) {
  return db.admin.findUnique({ where, include: { account: true } });
}

/**
 * Resuelve el "administrador general" en una API route, aceptando las dos vías
 * de login: sesión de Supabase (Google) o el JWT admin_token (email/contraseña).
 * Devuelve { admin, account } o null si no es admin general de ninguna cuenta.
 */
export async function getAccountAdmin(req: NextRequest) {
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
  } else {
    // 2) Fallback: admin_token JWT (login con email/contraseña)
    const token = req.cookies.get("admin_token")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (payload?.adminId) admin = await loadAdminWithAccount({ id: payload.adminId });
  }

  if (!admin?.accountId || !admin.account) return null;
  return { admin, account: admin.account };
}

/**
 * Igual que getAccountAdmin pero para Server Components (usa next/headers).
 * Devuelve el Admin (con su account) sin importar la vía de login, o null.
 */
export async function resolveServerAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    return loadAdminWithAccount({ email: user.email.toLowerCase() });
  }
  const session = await getSession();
  if (session?.adminId) return loadAdminWithAccount({ id: session.adminId });
  return null;
}
