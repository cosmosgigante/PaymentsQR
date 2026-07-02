import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { rateLimit } from "@/lib/rateLimit";
import { readDeviceId, setDeviceCookie } from "@/lib/tableSession";

// Cancelación del PEDIDO por el comensal. Solo se permite mientras está PENDING
// (la cocina todavía no lo tomó) y solo desde el dispositivo que lo hizo.
export async function POST(req: NextRequest) {
  let body: { tableToken?: string; orderId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const { tableToken, orderId } = body;
  if (!tableToken || !orderId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  if (!await rateLimit(`cancel:${tableToken}`, 15, 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const { deviceId } = readDeviceId(req);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { table: { select: { qrToken: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (order.table.qrToken !== tableToken) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Solo quien hizo el pedido (mismo dispositivo) puede cancelarlo. Si el pedido no
  // tiene dispositivo asociado, se deniega: nadie con solo el token de mesa puede cancelar.
  if (!order.deviceId || order.deviceId !== deviceId) {
    return NextResponse.json({ error: "Solo quien hizo el pedido puede cancelarlo" }, { status: 403 });
  }
  // Solo PENDING: una vez que la cocina lo tomó (CONFIRMED/PREPARING...) hay que avisar al mozo.
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Ya no se puede cancelar: la cocina ya lo tomó. Avisá al mozo." }, { status: 409 });
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  emitEvent(order.restaurantId, { type: "ORDER_UPDATED", order: updated });

  const res = NextResponse.json({ ok: true });
  setDeviceCookie(res, deviceId);
  return res;
}
