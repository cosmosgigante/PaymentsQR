import { NextRequest, NextResponse } from "next/server";

// Guarda la org seleccionada en una cookie httpOnly para que /cuenta sepa cuál mostrar.
export async function POST(req: NextRequest) {
  const { orgId } = await req.json().catch(() => ({})) as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: "Falta orgId" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("selected_org", orgId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24, path: "/" });
  return res;
}
