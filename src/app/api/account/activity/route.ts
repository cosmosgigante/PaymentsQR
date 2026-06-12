import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";

export const dynamic = "force-dynamic";

const CATEGORIES = ["PERSONAL", "PEDIDOS", "MENU", "MESAS", "CUENTA"];

// Actividad de la cuenta, con filtros opcionales por categoría y restorán.
export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const restaurantId = searchParams.get("restaurantId");

  const where: { accountId: string; category?: string; restaurantId?: string } = { accountId: ctx.account.id };
  if (category && CATEGORIES.includes(category)) where.category = category;
  if (restaurantId) where.restaurantId = restaurantId;

  const logs = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true, restaurantId: true, actorType: true, actorName: true,
      category: true, action: true, detail: true, createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
