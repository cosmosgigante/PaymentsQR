import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/admin", "/cocina", "/mozos", "/superadmin", "/setup"];
const PUBLIC_PATHS = ["/admin/login"];

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) return null;
  return new TextEncoder().encode(raw);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  if (!needsAuth || isPublic) return NextResponse.next();

  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Sesión Supabase (Google login)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return res;

  // JWT cookie (login manual email/password)
  const jwtSecret = getJwtSecret();
  const adminToken = req.cookies.get("admin_token")?.value;
  if (jwtSecret && adminToken) {
    try {
      await jwtVerify(adminToken, jwtSecret);
      return NextResponse.next();
    } catch { /* token inválido o expirado */ }
  }

  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/cocina/:path*", "/mozos/:path*", "/mozos", "/superadmin/:path*", "/setup"],
};
