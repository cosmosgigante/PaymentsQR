import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Salir de la impersonación: el superadmin estaba navegando con un admin_token
// impersonating=true; lo borramos y volvemos a /setup. Su sesión Supabase (la real
// del superadmin) sigue intacta. Si no estaba impersonando, no toca nada.
export async function GET(req: NextRequest) {
  const session = await getSession();
  const impersonating = !!session?.impersonating;
  const res = NextResponse.redirect(new URL(impersonating ? "/setup" : "/", req.url));
  if (impersonating) res.cookies.delete("admin_token");
  return res;
}
