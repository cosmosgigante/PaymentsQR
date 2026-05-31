import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

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

    const destination = admin.role === "SUPERADMIN" ? "/setup" : "/admin";
    const res = NextResponse.redirect(`${origin}${destination}`);
    capturedCookies.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    });
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/?error=auth`);
  }
}
