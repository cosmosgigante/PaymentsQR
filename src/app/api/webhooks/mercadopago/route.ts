import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";
import { getPayment } from "@/lib/mercadopago";
import { emitEvent } from "@/lib/events";

const UNPAID = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

// Webhook de MercadoPago. Confirma el cobro consultando el pago contra la API de
// MP con el token del propio restorán (no confía en el payload: anti-fraude).
// Siempre responde 200 para que MP no reintente en loop.
export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");
  if (!sessionId) return NextResponse.json({ ok: true });

  // Id del pago: puede venir por body o por query.
  let paymentId: string | null = null;
  try {
    const body = await req.json();
    paymentId = body?.data?.id ? String(body.data.id) : (body?.id ? String(body.id) : null);
  } catch { /* sin body */ }
  if (!paymentId) {
    paymentId = req.nextUrl.searchParams.get("data.id") || req.nextUrl.searchParams.get("id");
  }
  if (!paymentId) return NextResponse.json({ ok: true });

  const session = await db.tableSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ ok: true });

  // Ya estaba aprobado → nada que hacer.
  if (session.paymentStatus === "APPROVED") return NextResponse.json({ ok: true });

  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: session.restaurantId, provider: "MERCADOPAGO" } },
  });
  if (!pm?.encryptedToken) return NextResponse.json({ ok: true });

  let token: string;
  try { token = decryptSecret(pm.encryptedToken); } catch { return NextResponse.json({ ok: true }); }

  const payment = await getPayment(token, paymentId);
  if (!payment) return NextResponse.json({ ok: true });

  // Solo confirmamos si MP dice approved y el pago corresponde a ESTA sesión.
  if (payment.status === "approved" && payment.externalReference === sessionId) {
    await db.tableSession.update({ where: { id: sessionId }, data: { paymentStatus: "APPROVED" } });
    await db.order.updateMany({
      where: { tableSessionId: sessionId, status: { in: UNPAID } },
      data: { status: "PAID" },
    });
    emitEvent(session.restaurantId, { type: "SESSION_PAID", sessionId });
  }

  return NextResponse.json({ ok: true });
}
