import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  // Max 10 intentos por IP cada 15 minutos
  if (!await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá 15 minutos." },
      { status: 429 }
    );
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
    return NextResponse.redirect(new URL("/?error=auth", req.url), { status: 303 });
  }

  if (!email || !password) {
    return NextResponse.redirect(new URL("/?error=auth", req.url), { status: 303 });
  }

  if (email.length > 254 || password.length > 128) {
    return NextResponse.redirect(new URL("/?error=auth", req.url), { status: 303 });
  }

  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!admin) {
    return NextResponse.redirect(new URL("/?error=unauthorized", req.url), { status: 303 });
  }

  if (!admin.passwordHash) {
    // Primera vez: guardar la contraseña elegida por el usuario
    const hash = await bcrypt.hash(password, 12);
    await db.admin.update({ where: { email: email.toLowerCase().trim() }, data: { passwordHash: hash } });
  } else {
    // Verificar contraseña existente
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.redirect(new URL("/?error=invalid", req.url), { status: 303 });
    }
  }

  const token = await signToken({
    adminId: admin.id,
    restaurantId: admin.restaurantId ?? "",
    role: admin.role,
  });

  const destination = admin.role === "SUPERADMIN" ? "/setup" : "/admin";
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

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
