import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token.length > 200) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const table = await db.table.findUnique({
    where: { qrToken: token },
    include: { restaurant: true },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 404 });
  }

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: table.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { available: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({
    table: { id: table.id, number: table.number, label: table.label },
    restaurant: { name: table.restaurant.name, primaryColor: table.restaurant.primaryColor },
    categories,
  });
}
