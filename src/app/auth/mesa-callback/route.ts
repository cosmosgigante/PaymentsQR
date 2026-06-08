import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Callback OAuth exclusivo para clientes de mesa — no verifica tabla Admin
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Validar que el redirect sea al mismo origen (evitar open redirect)
  let safeNext = "/";
  if (next) {
    try {
      const url = new URL(next);
      if (url.origin === origin) safeNext = url.pathname + url.search;
    } catch { /* ignorar URLs inválidas */ }
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${safeNext}?error=auth`);
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

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } catch {
    return NextResponse.redirect(`${origin}${safeNext}?error=auth`);
  }

  const res = NextResponse.redirect(`${origin}${safeNext}`);
  capturedCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });
  return res;
}
