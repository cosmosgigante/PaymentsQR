import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

/**
 * Resuelve el "administrador general" (dueño de una Cuenta) a partir de la
 * sesión de Supabase de una API route. Devuelve { admin, account } o null si
 * el usuario logueado no es admin general de ninguna cuenta.
 */
export async function getAccountAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = await db.admin.findUnique({
    where: { email: user.email.toLowerCase() },
    include: { account: true },
  });
  if (!admin?.accountId || !admin.account) return null;

  return { admin, account: admin.account };
}
