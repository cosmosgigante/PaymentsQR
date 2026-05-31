import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { categoryId, name, description, price, image } = await req.json();
  if (!categoryId || !name || price == null) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const category = await db.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: session.restaurantId },
  });
  if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  const count = await db.menuItem.count({ where: { categoryId } });

  const item = await db.menuItem.create({
    data: {
      name,
      description,
      price: parseFloat(price),
      image,
      categoryId,
      restaurantId: session.restaurantId,
      sortOrder: count,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
