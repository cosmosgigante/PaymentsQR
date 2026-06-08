import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CartItem } from "@/lib/types";
import { emitEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {

  let body: { tableToken?: string; items?: CartItem[]; paymentMode?: string; notes?: string; customerName?: string; customerPhone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { tableToken, items, paymentMode, notes, customerName, customerPhone } = body;

  if (!tableToken || typeof tableToken !== "string" || tableToken.length > 200 || !Array.isArray(items) || !items.length || !paymentMode) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!["ONLINE", "CASHIER"].includes(paymentMode)) {
    return NextResponse.json({ error: "Modo de pago inválido" }, { status: 400 });
  }

  // Requerir nombre y teléfono para identificación del cliente
  const safeName = typeof customerName === "string" ? customerName.trim().slice(0, 100) : "";
  const safePhone = typeof customerPhone === "string" ? customerPhone.trim().slice(0, 30) : "";

  if (!safeName) {
    return NextResponse.json({ error: "Tu nombre es requerido para hacer el pedido" }, { status: 400 });
  }
  if (!safePhone) {
    return NextResponse.json({ error: "Tu teléfono es requerido para hacer el pedido" }, { status: 400 });
  }
  // Validación básica de formato telefónico (solo números, espacios, +, -, paréntesis)
  if (!/^[0-9+\-\s()]{6,20}$/.test(safePhone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }

  // Rate limit por token de mesa (no por IP, para que funcione en redes compartidas del restaurant)
  if (!await rateLimit(`order:${tableToken}`, 5, 2 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados pedidos. Esperá un momento." }, { status: 429 });
  }

  // Validar que los items tengan estructura correcta
  const validItems = items.every(
    (i) =>
      typeof i.menuItemId === "string" &&
      typeof i.quantity === "number" &&
      i.quantity > 0 &&
      i.quantity <= 50 // máx 50 unidades por item
  );
  if (!validItems) {
    return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
  }

  // Limitar a máx 20 items distintos por pedido
  if (items.length > 20) {
    return NextResponse.json({ error: "Demasiados items en el pedido" }, { status: 400 });
  }

  const table = await db.table.findUnique({
    where: { qrToken: tableToken },
    include: { restaurant: true },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 404 });
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId: table.restaurantId, available: true },
  });

  if (menuItems.length !== new Set(menuItemIds).size) {
    return NextResponse.json({ error: "Algún producto no está disponible" }, { status: 400 });
  }

  const priceMap = new Map(menuItems.map((m: { id: string; price: number }) => [m.id, m.price]));
  const total = items.reduce((sum: number, item: CartItem) => sum + (priceMap.get(item.menuItemId) ?? 0) * item.quantity, 0);

  // Sanitizar notas
  const safeNotes = notes ? String(notes).slice(0, 300) : undefined;

  const order = await db.order.create({
    data: {
      restaurantId: table.restaurantId,
      tableId: table.id,
      paymentMode,
      total,
      notes: safeNotes,
      customerName: safeName,
      customerPhone: safePhone,
      status: "PENDING",
      items: {
        create: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: priceMap.get(item.menuItemId)!,
          notes: item.notes ? String(item.notes).slice(0, 200) : undefined,
        })),
      },
    },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  emitEvent(table.restaurantId, { type: "NEW_ORDER", order });

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await db.order.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(status && ["PENDING","CONFIRMED","PREPARING","READY","DELIVERED","PAID","CANCELLED"].includes(status) ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
  });

  return NextResponse.json(orders);
}
