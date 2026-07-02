"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email")?.toString().toLowerCase().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) redirect("/?error=invalid");

  const admin = await db.admin.findUnique({ where: { email } });
  const dummyHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ViXRpBlYa";
  const valid = admin?.passwordHash
    ? await bcrypt.compare(password, admin.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!admin || !valid) redirect("/?error=invalid");

  const token = await signToken({
    adminId: admin.id,
    restaurantId: admin.restaurantId ?? "",
    role: admin.role,
  });

  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  redirect(admin.role === "SUPERADMIN" ? "/setup" : "/admin");
}

export async function registerAction(formData: FormData) {
  const email = formData.get("email")?.toString().toLowerCase().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirm")?.toString() ?? "";

  if (!email || !password || password !== confirm || password.length < 8) {
    redirect("/?error=register");
  }

  const admin = await db.admin.findUnique({ where: { email }, select: { id: true } });
  if (!admin) redirect("/?error=unauthorized");

  const hash = await bcrypt.hash(password, 12);
  await db.admin.update({ where: { email }, data: { passwordHash: hash } });

  // Login directo
  const fullAdmin = await db.admin.findUnique({ where: { email } });
  if (!fullAdmin) redirect("/?error=auth");

  const token = await signToken({
    adminId: fullAdmin.id,
    restaurantId: fullAdmin.restaurantId ?? "",
    role: fullAdmin.role,
  });

  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  redirect(fullAdmin.role === "SUPERADMIN" ? "/setup" : "/admin");
}
