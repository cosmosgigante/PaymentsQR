import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

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
  return { admin, email: user.email.toLowerCase() };
}

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.redirect(new URL("/?error=auth", req.url));

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const accountId    = req.nextUrl.searchParams.get("accountId");

  // Ingresar a cuenta (sin restorán específico → va a /cuenta)
  if (accountId && !restaurantId) {
    const account = await db.account.findUnique({
      where: { id: accountId },
      include: { admins: { where: { role: "OWNER" }, take: 1, select: { id: true, email: true } } },
    });
    if (!account) return NextResponse.redirect(new URL("/setup?error=no-account", req.url));
    const ownerAdmin = account.admins[0];
    if (!ownerAdmin) return NextResponse.redirect(new URL("/setup?error=no-admin", req.url));

    const token = await signToken({ adminId: ownerAdmin.id, restaurantId: "", role: "OWNER", accountId, impersonating: true });
    await logActivity({
      accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: sa.email,
      category: "CUENTA", action: "IMPERSONATE",
      detail: `${sa.email} ingresó a la cuenta de ${ownerAdmin.email}`,
    });
    // También en el ActivityLog de la cuenta (visible para el cliente)
    await logActivity({
      accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: sa.email,
      category: "CUENTA", action: "ADMIN_ACCESS",
      detail: `Acceso de soporte por ${sa.email}`,
    });
    const res = NextResponse.redirect(new URL("/cuenta", req.url));
    res.cookies.set("admin_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 2, path: "/" });
    return res;
  }

  // Ingresar a restorán específico → va a /admin
  if (!restaurantId) return NextResponse.redirect(new URL("/setup", req.url));

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    include: { account: { include: { admins: { where: { role: "OWNER" }, take: 1, select: { id: true, email: true } } } } },
  });
  if (!restaurant) return NextResponse.redirect(new URL("/setup?error=no-account", req.url));

  let adminId = restaurant.account?.admins[0]?.id;
  const adminEmail = restaurant.account?.admins[0]?.email ?? sa.email;
  if (!adminId) {
    const legacyOwner = await db.admin.findFirst({ where: { restaurantId, role: "OWNER" }, select: { id: true, email: true } });
    adminId = legacyOwner?.id ?? sa.admin.id;
  }

  const token = await signToken({ adminId, restaurantId: restaurant.id, role: "OWNER", accountId: restaurant.accountId ?? undefined, impersonating: true });
  await logActivity({
    accountId: restaurant.accountId, restaurantId: restaurant.id,
    actorType: "SUPERADMIN", actorName: sa.email,
    category: "CUENTA", action: "IMPERSONATE",
    detail: `${sa.email} ingresó al panel de ${restaurant.name} (cuenta: ${adminEmail})`,
  });

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set("admin_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 2, path: "/" });
  return res;
}
