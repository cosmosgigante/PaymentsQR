import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";
import { getPayment } from "@/lib/mercadopago";
import { emitEvent } from "@/lib/events";

// Webhook de MercadoPago. Confirma el cobro consultando el pago contra la API de
// MP con el token del propio restorán (no confía en el payload: anti-fraude).
// Cada cobro cubre un snapshot fijo de pedidos (Payment.orderIds) → al aprobar,
// marca SOLO esos pedidos como pagados (clave para dividir la cuenta).
// Siempre responde 200 para que MP no reintente en loop.
export async function POST(req: NextRequest) {
  const paymentRecordId = req.nextUrl.searchParams.get("payment");
  if (!paymentRecordId) return NextResponse.json({ ok: true });

  // Id del pago en MP: por body o por query.
  let mpPaymentId: string | null = null;
  try {
    const body = await req.json();
    mpPaymentId = body?.data?.id ? String(body.data.id) : (body?.id ? String(body.id) : null);
  } catch { /* sin body */ }
  if (!mpPaymentId) mpPaymentId = req.nextUrl.searchParams.get("data.id") || req.nextUrl.searchParams.get("id");
  if (!mpPaymentId) return NextResponse.json({ ok: true });

  const payment = await db.payment.findUnique({ where: { id: paymentRecordId } });
  if (!payment || payment.status === "APPROVED") return NextResponse.json({ ok: true });

  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: payment.restaurantId, provider: "MERCADOPAGO" } },
  });
  if (!pm?.encryptedToken) return NextResponse.json({ ok: true });

  let token: string;
  try { token = decryptSecret(pm.encryptedToken); } catch { return NextResponse.json({ ok: true }); }

  const mp = await getPayment(token, mpPaymentId);
  if (!mp) return NextResponse.json({ ok: true });

  // Solo confirmamos si MP dice approved y el pago corresponde a ESTE Payment.
  if (mp.status === "approved" && mp.externalReference === payment.id) {
    // Validar que el monto pagado coincida con el esperado (anti-fraude)
    if (Math.abs(mp.amount - payment.amount) > 1) {
      await db.payment.update({ where: { id: payment.id }, data: { status: "AMOUNT_MISMATCH" } });
      return NextResponse.json({ ok: true });
    }

    let orderIds: string[] = [];
    try { const v = JSON.parse(payment.orderIds || "[]"); if (Array.isArray(v)) orderIds = v; } catch { /* ignore */ }

    await db.payment.update({ where: { id: payment.id }, data: { status: "APPROVED", paidAt: new Date() } });
    if (orderIds.length > 0) {
      // Pedidos que estaban esperando pago → ahora van a cocina
      await db.order.updateMany({
        where: { id: { in: orderIds }, tableSessionId: payment.sessionId, status: "AWAITING_PAYMENT" },
        data: { status: "PREPARING" },
      });
      // Pedidos que ya estaban en proceso → marcar como pagados
      await db.order.updateMany({
        where: { id: { in: orderIds }, tableSessionId: payment.sessionId, status: { notIn: ["AWAITING_PAYMENT", "PAID", "CANCELLED"] } },
        data: { status: "PAID" },
      });

      // Notificar a cocina de los pedidos nuevos que entraron
      const newOrders = await db.order.findMany({
        where: { id: { in: orderIds }, status: "PREPARING" },
        include: { items: { include: { menuItem: true } }, table: true },
      });
      for (const order of newOrders) {
        emitEvent(payment.restaurantId, { type: "NEW_ORDER", order });
      }
    }
    emitEvent(payment.restaurantId, { type: "SESSION_PAID", sessionId: payment.sessionId });
  }

  return NextResponse.json({ ok: true });
}
