import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageAny } from "@/lib/staff";
import { logActivity } from "@/lib/activity";

function isValidImageUrl(url: string): boolean {
  if (/^\/uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-z]+$/.test(url)) return true;
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
  if (!canManageAny(session, ["MENU"])) return NextResponse.json({ error: "No tenés permiso para editar el menú" }, { status: 403 });

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
    if (isNaN(price) || price <= 0 || price > 1_000_000) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }
  }

  // Validar URL de imagen si viene — solo https
  if (body.image !== undefined && body.image !== null && body.image !== "") {
    if (typeof body.image !== "string" || !isValidImageUrl(body.image)) {
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
      ...(body.available === true || body.available === false ? { available: body.available } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageAny(session, ["MENU"])) return NextResponse.json({ error: "No tenés permiso para editar el menú" }, { status: 403 });

  const { id } = await params;

  // Verificar que el item pertenece al restaurante (IDOR prevention)
  const item = await db.menuItem.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!item) return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });

  await db.menuItem.delete({ where: { id } });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "MENU", action: "MENU_ITEM_DELETE", detail: `Plato "${item.name}"`,
  });

  return NextResponse.json({ ok: true });
}
