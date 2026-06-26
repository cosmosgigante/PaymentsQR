import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Conteos livianos por sección (globos del dashboard). groupBy = sin traer los
// pedidos ni sus items, solo los contadores. Pensado para pollear sin costo.
export async function GET() {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const grouped = await db.order.groupBy({
    by: ["status"],
    where: {
      restaurantId: session.restaurantId,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"] },
    },
    _count: { id: true },
  });

  const by: Record<string, number> = {};
  for (const g of grouped) by[g.status] = g._count.id;

  return NextResponse.json({
    kitchen: (by.PENDING ?? 0) + (by.CONFIRMED ?? 0) + (by.PREPARING ?? 0),
    mozos: (by.READY ?? 0) + (by.DELIVERED ?? 0),
  });
}
