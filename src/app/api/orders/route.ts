import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CartItem } from "@/lib/types";
import { emitEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";
import { isRestaurantOperative } from "@/lib/restaurant";
import { joinOrCreateSession, readDeviceId, setDeviceCookie } from "@/lib/tableSession";

export async function POST(req: NextRequest) {

  let body: { tableToken?: string; items?: CartItem[]; paymentMode?: string; notes?: string; customerName?: string; customerEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { tableToken, items, paymentMode, notes, customerName, customerEmail } = body;

  if (!tableToken || typeof tableToken !== "string" || tableToken.length > 200 || !Array.isArray(items) || !items.length || !paymentMode) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!["ONLINE", "CASHIER"].includes(paymentMode)) {
    return NextResponse.json({ error: "Modo de pago inválido" }, { status: 400 });
  }

  const safeName  = typeof customerName  === "string" ? customerName.trim().slice(0, 100)  : "";
  const safeEmail = typeof customerEmail === "string" ? customerEmail.trim().slice(0, 200) : "";

  // Pagar en caja requiere identidad verificada con Google
  if (paymentMode === "CASHIER") {
    if (!safeName || !safeEmail) return NextResponse.json({ error: "Identificación requerida para pagar en caja" }, { status: 400 });
  }

  if (!await rateLimit(`order:${tableToken}`, 5, 2 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados pedidos. Esperá un momento." }, { status: 429 });
  }

  const validItems = items.every(
    (i) => typeof i.menuItemId === "string" && typeof i.quantity === "number" && i.quantity > 0 && i.quantity <= 50
  );
  if (!validItems) return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
  if (items.length > 20) return NextResponse.json({ error: "Demasiados items en el pedido" }, { status: 400 });

  const table = await db.table.findUnique({
    where: { qrToken: tableToken },
    include: { restaurant: { include: { account: true } } },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 404 });
  }

  if (!isRestaurantOperative(table.restaurant, table.restaurant.account)) {
    return NextResponse.json({ error: "Este restaurante no está disponible en este momento" }, { status: 403 });
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

  const safeNotes = notes ? String(notes).slice(0, 300) : undefined;

  // Atar el pedido a la sesión de mesa del dispositivo (estado real, no del navegador).
  const { deviceId } = readDeviceId(req);
  const { session, full } = await joinOrCreateSession({
    tableId: table.id,
    restaurantId: table.restaurantId,
    maxDevices: table.restaurant.maxTableDevices ?? 2,
    deviceId,
    startStatus: table.restaurant.confirmTableEnabled ? "PENDING_CONFIRM" : "OPEN",
  });
  if (full) {
    return NextResponse.json({ error: "Esta mesa alcanzó el máximo de dispositivos conectados" }, { status: 409 });
  }

  const order = await db.order.create({
    data: {
      restaurantId:  table.restaurantId,
      tableId:       table.id,
      tableSessionId: session.id,
      deviceId,
      paymentMode,
      total,
      notes:         safeNotes,
      customerName:  safeName  || undefined,
      customerEmail: safeEmail || undefined,
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

  const res = NextResponse.json(order, { status: 201 });
  setDeviceCookie(res, deviceId);
  return res;
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
