import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`check-email:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ allowed: false }, { status: 429 });
  }

  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ allowed: false }, { status: 400 }); }

  const email = body.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ allowed: false }, { status: 400 });

  const admin = await db.admin.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ allowed: !!admin });
}
