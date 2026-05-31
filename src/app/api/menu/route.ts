import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  const slug = searchParams.get("slug");

  const where = restaurantId ? { restaurantId } : slug ? { restaurant: { slug } } : null;
  if (!where) return NextResponse.json({ error: "Falta restaurantId o slug" }, { status: 400 });

  const categories = await db.menuCategory.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { available: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });

  const count = await db.menuCategory.count({ where: { restaurantId: session.restaurantId } });

  const category = await db.menuCategory.create({
    data: { name, restaurantId: session.restaurantId, sortOrder: count },
  });

  return NextResponse.json(category, { status: 201 });
}
