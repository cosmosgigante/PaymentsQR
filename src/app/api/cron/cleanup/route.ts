import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Vercel Cron llama este endpoint con el header Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── 1. Anonimizar datos personales de pedidos con más de 90 días ─────────
  // Se conserva el pedido para estadísticas del restaurante pero se borra
  // el nombre y email del comensal (datos personales bajo Ley 25.326)
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const anonymized = await db.order.updateMany({
    where: {
      createdAt: { lt: cutoff90 },
      OR: [
        { customerName: { not: null } },
        { customerEmail: { not: null } },
      ],
    },
    data: {
      customerName:  null,
      customerEmail: null,
    },
  });

  // ── 2. Eliminar logs de actividad con más de 90 días ─────────────────────
  const deletedLogs = await db.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff90 } },
  });

  // ── 3. Eliminar sesiones de personal inactivas hace más de 30 días ───────
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const deletedSessions = await db.accessSession.deleteMany({
    where: { lastSeenAt: { lt: cutoff30 } },
  });

  // ── 4. Cancelar pedidos AWAITING_PAYMENT que llevan +30 min sin pagar ────
  const cutoff30min = new Date(now.getTime() - 30 * 60 * 1000);

  const cancelledAwaitingPayment = await db.order.updateMany({
    where: { status: "AWAITING_PAYMENT", createdAt: { lt: cutoff30min } },
    data: { status: "CANCELLED" },
  });

  // ── 5. Limpiar entradas de rate limit vencidas ───────────────────────────
  const deletedRateLimit = await db.rateLimit.deleteMany({
    where: { resetAt: { lt: now } },
  });

  const result = {
    ok: true,
    ran: now.toISOString(),
    anonymizedOrders:   anonymized.count,
    deletedActivityLogs: deletedLogs.count,
    deletedSessions:    deletedSessions.count,
    cancelledUnpaid:    cancelledAwaitingPayment.count,
    deletedRateLimits:  deletedRateLimit.count,
  };

  console.log("[cron/cleanup]", result);
  return NextResponse.json(result);
}
