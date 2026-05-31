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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  // Verificar que el item pertenece al restaurante (IDOR prevention)
  const item = await db.menuItem.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!item) return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });

  // Validar precio si viene
  if (body.price !== undefined) {
    const price = parseFloat(String(body.price));
    if (isNaN(price) || price < 0 || price > 1_000_000) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }
  }

  // Validar URL de imagen si viene — solo https
  if (body.image !== undefined && body.image !== null && body.image !== "") {
    if (typeof body.image !== "string" || !isValidHttpsUrl(body.image)) {
      return NextResponse.json({ error: "La imagen debe ser una URL https válida" }, { status: 400 });
    }
  }

  const updated = await db.menuItem.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).slice(0, 200) }),
      ...(body.description !== undefined && { description: body.description ? String(body.description).slice(0, 500) : null }),
      ...(body.price !== undefined && { price: parseFloat(String(body.price)) }),
      ...(body.image !== undefined && { image: body.image ? String(body.image) : null }),
      ...(body.available !== undefined && { available: Boolean(body.available) }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Verificar que el item pertenece al restaurante (IDOR prevention)
  const item = await db.menuItem.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!item) return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });

  await db.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
