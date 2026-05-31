import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { OrderStatus } from "@/lib/types";

// GET — accesible con token de mesa (cliente) o sesión admin
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tableToken = req.nextUrl.searchParams.get("t");
  const session = await getSession();

  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  if (session && order.restaurantId === session.restaurantId) {
    return NextResponse.json(order);
  }

  if (tableToken && typeof tableToken === "string" && order.table.qrToken === tableToken) {
    return NextResponse.json(order);
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  let body: { status?: OrderStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { status } = body;

  const validStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "PAID", "CANCELLED"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  // Verificar que el pedido pertenece al restaurante del admin (IDOR prevention)
  const order = await db.order.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const updated = await db.order.update({
    where: { id },
    data: { status },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  emitEvent(session.restaurantId, { type: "ORDER_UPDATED", order: updated });

  return NextResponse.json(updated);
}
