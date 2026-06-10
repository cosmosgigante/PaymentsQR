import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// Hash dummy válido para timing-safe comparison cuando el email no existe
// Generado con: bcrypt.hashSync("dummy", 12) — longitud exacta 60 chars
const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ViXRpBlYa";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  if (!await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá 15 minutos." }, { status: 429 });
  }

  let email: string | undefined;
  let password: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      email = form.get("email")?.toString();
      password = form.get("password")?.toString();
    } else {
      const body = await req.json();
      email = body.email;
      password = body.password;
    }
  } catch {
    return NextResponse.redirect(new URL("/?error=invalid", req.url), { status: 303 });
  }

  if (!email || !password || email.length > 254 || password.length > 128) {
    return NextResponse.redirect(new URL("/?error=invalid", req.url), { status: 303 });
  }

  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Siempre hacer bcrypt.compare para evitar timing attacks que revelen emails válidos
  const hashToCheck = admin?.passwordHash ?? DUMMY_HASH;
  const valid = admin?.passwordHash
    ? await bcrypt.compare(password, hashToCheck)
    : await bcrypt.compare(password, DUMMY_HASH).then(() => false); // dummy: siempre false

  if (!admin || !valid) {
    // Mismo error para email inexistente y contraseña incorrecta — no revela cuál es
    if (admin && !admin.passwordHash) {
      // Primera vez: el admin existe pero nunca configuró contraseña — registrarlo
      const hash = await bcrypt.hash(password, 12);
      await db.admin.update({ where: { email: email.toLowerCase().trim() }, data: { passwordHash: hash } });
    } else {
      return NextResponse.redirect(new URL("/?error=invalid", req.url), { status: 303 });
    }
  }

  const token = await signToken({
    adminId: admin.id,
    restaurantId: admin.restaurantId ?? "",
    role: admin.role,
  });

  const destination = admin.role === "SUPERADMIN"
    ? "/setup"
    : admin.accountId
    ? "/cuenta"
    : "/admin";
  const res = NextResponse.redirect(new URL(destination, req.url), { status: 303 });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");

  // También cerrar sesión de Supabase para limpiar el Google OAuth session
  const origin = new URL(req.url).origin;
  res.headers.set("X-Supabase-Signout", "true"); // señal para el cliente
  void origin; // evitar unused warning
  return res;
}
