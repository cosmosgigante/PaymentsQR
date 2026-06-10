import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`register:${ip}`, 5, 60 * 1000)) {
    return NextResponse.redirect(new URL("/?error=rate", req.url), 303);
  }

  const form = await req.formData();
  const email = form.get("email")?.toString().toLowerCase().trim() ?? "";
  const password = form.get("password")?.toString() ?? "";
  const confirm = form.get("confirm")?.toString() ?? "";

  if (!email || !password || password.length < 6 || password !== confirm) {
    return NextResponse.redirect(new URL("/?error=register", req.url), 303);
  }

  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) return NextResponse.redirect(new URL("/?error=unauthorized", req.url), 303);

  // Si ya tiene contraseña, no permitir registro — debe usar login
  if (admin.passwordHash) return NextResponse.redirect(new URL("/?error=already-registered", req.url), 303);

  const hash = await bcrypt.hash(password, 12);
  await db.admin.update({ where: { email }, data: { passwordHash: hash } });

  const token = await signToken({
    adminId: admin.id,
    restaurantId: admin.restaurantId ?? "",
    role: admin.role,
  });

  const destination = admin.role === "SUPERADMIN" ? "/setup" : admin.accountId ? "/cuenta" : "/admin";
  const res = NextResponse.redirect(new URL(destination, req.url), 303);
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
