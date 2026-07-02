import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`register:${ip}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const admin = await db.admin.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!admin) {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso" }, { status: 403 });
  }

  // Si ya tiene contraseña, no permitir sobreescritura
  if (admin.passwordHash) {
    return NextResponse.json({ error: "Esta cuenta ya está registrada" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);

  // Guardar el hash en la tabla Admin — no depende de Supabase Auth
  await db.admin.update({
    where: { email },
    data: { passwordHash: hash },
  });

  return NextResponse.json({ ok: true });
}
