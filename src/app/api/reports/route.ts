import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days")) || 7, 30);

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: {
      restaurantId: session.restaurantId,
      status: "PAID",
      createdAt: { gte: since },
    },
    select: {
      total: true,
      createdAt: true,
      paymentMode: true,
      items: { select: { quantity: true, unitPrice: true, menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Ventas por día
  const salesByDay: Record<string, { revenue: number; count: number }> = {};
  for (let d = 0; d < days; d++) {
    const date = new Date(since);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    salesByDay[key] = { revenue: 0, count: 0 };
  }
  // Hoy también
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!salesByDay[todayKey]) salesByDay[todayKey] = { revenue: 0, count: 0 };

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (!salesByDay[key]) salesByDay[key] = { revenue: 0, count: 0 };
    salesByDay[key].revenue += o.total;
    salesByDay[key].count += 1;
  }

  // Top platos
  const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const o of orders) {
    for (const item of o.items) {
      const name = item.menuItem.name;
      if (!itemCounts[name]) itemCounts[name] = { name, qty: 0, revenue: 0 };
      itemCounts[name].qty += item.quantity;
      itemCounts[name].revenue += item.quantity * item.unitPrice;
    }
  }
  const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Totales
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cashierOrders = orders.filter((o) => o.paymentMode === "CASHIER").length;
  const onlineOrders = orders.filter((o) => o.paymentMode === "ONLINE").length;

  return NextResponse.json({
    days,
    totalRevenue,
    totalOrders,
    avgTicket,
    cashierOrders,
    onlineOrders,
    salesByDay: Object.entries(salesByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data })),
    topItems,
  });
}
