import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

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

  let user;
  try {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/?error=auth`);
    user = data?.user;
  } catch {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  // Verificar que el email esté registrado en la DB ANTES de dejarlo entrar
  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=unauthorized`);
  }

  const admin = await db.admin.findUnique({
    where: { email: user.email.toLowerCase() },
  });

  if (!admin) {
    await supabase.auth.signOut();
    const res = NextResponse.redirect(`${origin}/?error=unauthorized`);
    capturedCookies.forEach(({ name }) => res.cookies.delete(name));
    return res;
  }

  const res = NextResponse.redirect(`${origin}/auth/redirect`);
  capturedCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });

  // Para roles que usan el panel JWT (/admin), crear también la cookie admin_token
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
}
