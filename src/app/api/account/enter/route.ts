import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";
import { signToken } from "@/lib/auth";

// El admin general entra a uno de SUS restoranes. Genera una sesión scopeada a
// ese restorán (sin asignarse como personal del local) y redirige a /admin.
export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.redirect(new URL("/?error=auth", req.url));

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.redirect(new URL("/cuenta", req.url));

  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, accountId: ctx.account.id },
    select: { id: true, status: true },
  });

  if (!restaurant) return NextResponse.redirect(new URL("/cuenta", req.url));
  if (restaurant.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/cuenta?error=pendiente", req.url));
  }

  const token = await signToken({
    adminId: ctx.admin.id,
    restaurantId: restaurant.id,
    role: "OWNER",
    accountId: ctx.account.id,
    actorName: ctx.account.ownerEmail,
  });

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
