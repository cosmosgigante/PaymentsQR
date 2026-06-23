import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";

// Datos de la cuenta del admin general + sus restoranes
export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const restaurants = await db.restaurant.findMany({
    where: { accountId: ctx.account.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      createdAt: true,
      vertical: true,
      _count: { select: { tables: true, orders: true } },
    },
  });

  const { id, ownerEmail, name, planType, priceArs, subscriptionStartedAt, subscriptionEndsAt, paymentSource, isActive } = ctx.account;

  return NextResponse.json({
    account: { id, ownerEmail, name, planType, priceArs, subscriptionStartedAt, subscriptionEndsAt, paymentSource, isActive },
    restaurants,
  });
}
