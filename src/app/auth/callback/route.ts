import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  const admin = await db.admin.findUnique({
    where: { email: data.user.email.toLowerCase() },
  });

  const destination = !admin
    ? "/?error=unauthorized"
    : admin.role === "SUPERADMIN"
    ? "/setup"
    : "/admin";

  const res = NextResponse.redirect(`${origin}${destination}`);
  capturedCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });

  return res;
}
