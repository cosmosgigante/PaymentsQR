import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { emitEvent } from "@/lib/events";
import { isRestaurantOperative } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

// Estados que cuentan como "en la cola" de preparación (delante tuyo).
const QUEUE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING"];

// Devuelve el punto (Table) por defecto del kiosco; lo crea si no existe.
// El kiosco usa UN punto "Mostrador" que reusa el modelo de mesa.
async function getOrCreateStorePoint(restaurantId: string) {
  const existing = await db.table.findFirst({
    where: { restaurantId }, orderBy: { number: "asc" },
  });
  if (existing) return existing;
  return db.table.create({
    data: { restaurantId, number: 1, label: "Mostrador" },
  });
}

// POST — un cliente (anónimo o con nombre) hace un pedido de kiosco.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`tienda:${ip}`, 6, 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos, esperá un momento" }, { status: 429 });
  }

  let body: { slug?: string; items?: { menuItemId?: string; quantity?: number; notes?: string }[]; name?: string; email?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const { slug, items } = body;
  if (!slug || !Array.isArray(items) || items.length === 0 || items.length > 30) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const validItems = items.every((i) => typeof i.menuItemId === "string" && typeof i.quantity === "number" && i.quantity > 0 && i.quantity <= 50);
  if (!validItems) return NextResponse.json({ error: "Items inválidos" }, { status: 400 });

  // "Pagar al retirar" exige identidad verificada (login con Google) — anti pedido falso.
  // El pago anónimo va por /api/tienda/pay (online, cuando MercadoPago esté instalado).
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!email || !name) {
    return NextResponse.json({ error: "Iniciá sesión con Google para pagar al retirar" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: { account: true },
  });
  if (!restaurant || restaurant.vertical !== "KIOSCO_DESPENSA") {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }
  if (!isRestaurantOperative(restaurant, restaurant.account)) {
    return NextResponse.json({ error: "La tienda no está disponible en este momento" }, { status: 403 });
  }

  // Precios reales desde la base (nunca confiar en el cliente)
  const menuItemIds = items.map((i) => i.menuItemId!);
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId: restaurant.id, available: true },
  });
  if (menuItems.length !== new Set(menuItemIds).size) {
    return NextResponse.json({ error: "Algún producto ya no está disponible" }, { status: 400 });
  }
  const priceMap = new Map(menuItems.map((m: { id: string; price: number }) => [m.id, m.price]));
  const total = items.reduce((s, i) => s + (priceMap.get(i.menuItemId!) ?? 0) * i.quantity!, 0);

  const point = await getOrCreateStorePoint(restaurant.id);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 300) : undefined;

  const order = await db.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId: point.id,
      paymentMode: "CASHIER", // pagás al retirar (con identidad Google)
      total,
      notes,
      customerName: name,
      customerEmail: email,
      status: "PENDING",
      items: {
        create: items.map((i) => ({
          menuItemId: i.menuItemId!,
          quantity: i.quantity!,
          unitPrice: priceMap.get(i.menuItemId!)!,
          notes: i.notes ? String(i.notes).slice(0, 200) : undefined,
        })),
      },
    },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  emitEvent(restaurant.id, { type: "NEW_ORDER", order });

  const ahead = await db.order.count({
    where: { restaurantId: restaurant.id, status: { in: QUEUE_STATUSES }, createdAt: { lt: order.createdAt } },
  });

  return NextResponse.json({
    ok: true,
    id: order.id,
    code: order.id.slice(-4).toUpperCase(),
    position: ahead + 1,
    total,
  }, { status: 201 });
}

// GET — estado de un pedido de kiosco (polling público del cliente).
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, total: true, customerName: true, restaurantId: true, createdAt: true },
  });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const inQueue = QUEUE_STATUSES.includes(order.status);
  const ahead = inQueue
    ? await db.order.count({
        where: { restaurantId: order.restaurantId, status: { in: QUEUE_STATUSES }, createdAt: { lt: order.createdAt } },
      })
    : 0;

  return NextResponse.json({
    status: order.status,
    code: order.id.slice(-4).toUpperCase(),
    total: order.total,
    name: order.customerName,
    position: inQueue ? ahead + 1 : 0,
  });
}
