import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";

export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const access = accountAccess(ctx.admin, ctx.account);
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days")) || 7, 90);
  const restaurantId = searchParams.get("restaurantId");
  const all = searchParams.get("all") === "1";

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  let restaurantIds: string[];

  if (all) {
    const restaurants = await db.restaurant.findMany({
      where: access.isFull
        ? { accountId: ctx.account.id, status: "ACTIVE" }
        : { accountId: ctx.account.id, status: "ACTIVE", id: { in: access.allowedRestaurantIds ?? [] } },
      select: { id: true },
    });
    restaurantIds = restaurants.map((r) => r.id);
  } else if (restaurantId) {
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, accountId: ctx.account.id },
      select: { id: true },
    });
    if (!restaurant) return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
    if (!access.isFull && !(access.allowedRestaurantIds ?? []).includes(restaurantId)) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    restaurantIds = [restaurantId];
  } else {
    return NextResponse.json({ error: "Falta restaurantId o all=1" }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: {
      restaurantId: { in: restaurantIds },
      status: "PAID",
      createdAt: { gte: since },
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      paymentMode: true,
      customerName: true,
      restaurant: { select: { name: true } },
      table: { select: { number: true } },
      items: { select: { quantity: true, unitPrice: true, menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Fecha,Restaurante,Mesa,Cliente,Modo de pago,Items,Total";
  const rows = orders.map((o) => {
    const fecha = o.createdAt.toISOString().slice(0, 16).replace("T", " ");
    const items = o.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(" + ");
    const cliente = (o.customerName ?? "Anónimo").replace(/,/g, " ");
    const pago = o.paymentMode === "ONLINE" ? "Online" : "Caja";
    return `${fecha},${o.restaurant.name},${o.table.number},${cliente},${pago},"${items}",${o.total}`;
  });

  const csv = [header, ...rows].join("\n");
  const filename = all ? `ventas-todos-${days}d.csv` : `ventas-${days}d.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
