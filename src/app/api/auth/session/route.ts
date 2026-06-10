import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const capturedCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) { capturedCookies.push(...cookiesToSet); },
      },
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.redirect(`${origin}/`);
    }

    const admin = await db.admin.findUnique({
      where: { email: user.email.toLowerCase() },
    });

    if (!admin) {
      return NextResponse.redirect(`${origin}/?error=unauthorized`);
    }

    const destination = admin.role === "SUPERADMIN" ? "/setup" : admin.accountId ? "/cuenta" : "/admin";
    const res = NextResponse.redirect(`${origin}${destination}`);
    capturedCookies.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    });

    // Para owners que entran por email/contraseña, crear también la cookie JWT del panel /admin
    if (admin.role !== "SUPERADMIN" && admin.restaurantId) {
      const token = await signToken({
        adminId: admin.id,
        restaurantId: admin.restaurantId,
        role: admin.role,
      });
      res.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 8,
        path: "/",
      });
    }

    return res;
  } catch {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }
}
