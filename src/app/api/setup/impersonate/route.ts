import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const admin = await db.admin.findUnique({ where: { email: user.email.toLowerCase() } });
  if (admin?.role !== "SUPERADMIN") return null;
  return admin;
}

export async function GET(req: NextRequest) {
  const superAdmin = await requireSuperAdmin(req);
  if (!superAdmin) return NextResponse.redirect(new URL("/?error=auth", req.url));

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.redirect(new URL("/setup", req.url));

  const owner = await db.admin.findFirst({
    where: { restaurantId, role: "OWNER" },
  });

  if (!owner || !owner.passwordHash) {
    return NextResponse.redirect(new URL("/setup?error=no-account", req.url));
  }

  const token = await signToken({
    adminId: owner.id,
    restaurantId: owner.restaurantId ?? "",
    role: owner.role,
  });

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2, // 2 horas — sesión de impersonación corta
    path: "/",
  });
  return res;
}
