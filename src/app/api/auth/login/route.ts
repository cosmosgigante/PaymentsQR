import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  // Max 10 intentos por IP cada 15 minutos
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá 15 minutos." },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Limitar tamaño para evitar ataques con strings enormes
  if (email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Timing-safe: siempre hacer bcrypt.compare para no revelar si el email existe
  const dummyHash = "$2a$12$dummyhashtopreventtimingattacksxxxxxxxxxxxxxxxxxxxxxxxxx";
  const valid = admin
    ? await bcrypt.compare(password, admin.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!admin || !valid) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await signToken({
    adminId: admin.id,
    restaurantId: admin.restaurantId,
    role: admin.role,
  });

  const res = NextResponse.json({ ok: true, role: admin.role });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // strict es más seguro que lax para CSRF
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
