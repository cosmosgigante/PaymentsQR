import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { categoryId, name, description, price, image } = body;

  if (!categoryId || !name || price == null) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  // Validar precio
  const parsedPrice = parseFloat(String(price));
  if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1_000_000) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  // Validar imagen — solo https
  if (image && typeof image === "string" && image !== "") {
    if (!isValidHttpsUrl(image)) {
      return NextResponse.json({ error: "La imagen debe ser una URL https válida" }, { status: 400 });
    }
  }

  const category = await db.menuCategory.findFirst({
    where: { id: String(categoryId), restaurantId: session.restaurantId },
  });
  if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  const count = await db.menuItem.count({ where: { categoryId: String(categoryId) } });

  const item = await db.menuItem.create({
    data: {
      name: String(name).slice(0, 200),
      description: description ? String(description).slice(0, 500) : null,
      price: parsedPrice,
      image: image ? String(image) : null,
      categoryId: String(categoryId),
      restaurantId: session.restaurantId,
      sortOrder: count,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
