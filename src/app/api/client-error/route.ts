import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

// Recibe errores de las pantallas del cliente (error.tsx / global-error.tsx) y
// los guarda para el panel "Salud del sistema". Público pero acotado por rate limit.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`clierr:${ip}`, 20, 60 * 1000)) {
    return NextResponse.json({ ok: true }); // silencioso: no exponer el límite
  }

  let body: { message?: string; digest?: string; path?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const message = typeof body.message === "string" ? body.message.slice(0, 1000) : "";
  if (!message) return NextResponse.json({ ok: true });

  try {
    await db.errorLog.create({
      data: {
        message,
        digest: typeof body.digest === "string" ? body.digest.slice(0, 200) : null,
        path: typeof body.path === "string" ? body.path.slice(0, 300) : null,
        source: "CLIENT",
      },
    });
  } catch { /* no romper por el logueo */ }

  return NextResponse.json({ ok: true });
}
