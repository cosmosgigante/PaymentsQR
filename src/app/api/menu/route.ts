import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageAny } from "@/lib/staff";
import { logActivity } from "@/lib/activity";

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
  if (!canManageAny(session, ["MENU"])) return NextResponse.json({ error: "No tenés permiso para editar el menú" }, { status: 403 });

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { name } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
  }

  const safeName = name.trim().slice(0, 100);
  if (!safeName) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });

  const count = await db.menuCategory.count({ where: { restaurantId: session.restaurantId } });

  const category = await db.menuCategory.create({
    data: { name: safeName, restaurantId: session.restaurantId, sortOrder: count },
  });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "MENU", action: "MENU_CATEGORY_CREATE", detail: `Categoría "${safeName}"`,
  });

  return NextResponse.json(category, { status: 201 });
}
