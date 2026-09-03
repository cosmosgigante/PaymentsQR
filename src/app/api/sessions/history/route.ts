import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/staff";
import { SESSION_TTL_MS } from "@/lib/tableSession";

export const dynamic = "force-dynamic";

// Ventana operativa del historial: 48h. NO borra datos (los reportes financieros
// siguen usando las órdenes); solo acota qué sesiones se listan como "recientes".
const RETENTION_MS = 48 * 60 * 60 * 1000;

// Historial de SESIONES de mesa terminadas de las últimas 48h. Una sesión termina
// cuando el staff la cierra (status CLOSED) o cuando vence por inactividad (sigue
// OPEN pero sin actividad hace más del TTL). Incluye las rondas para el detalle.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccess(session, "MESAS") && !canAccess(session, "MOZOS") && !canAccess(session, "COCINA")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const now = Date.now();
  const retentionCutoff = new Date(now - RETENTION_MS);
  const staleCutoff = new Date(now - SESSION_TTL_MS);

  const sessions = await db.tableSession.findMany({
    where: {
      restaurantId: session.restaurantId,
      OR: [
        // Cerradas por el staff dentro de la ventana.
        { status: "CLOSED", closedAt: { gte: retentionCutoff } },
        // Vencidas por inactividad (siguen OPEN pero sin actividad hace > TTL).
        { status: { in: ["OPEN", "PENDING_CONFIRM"] }, lastActivityAt: { lt: staleCutoff, gte: retentionCutoff } },
      ],
    },
    orderBy: [{ closedAt: "desc" }, { lastActivityAt: "desc" }],
    take: 80,
    include: {
      table: { select: { number: true, label: true } },
      orders: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, status: true, total: true, paymentMode: true, createdAt: true,
          items: { select: { quantity: true, menuItem: { select: { name: true } } } },
        },
      },
    },
  });

  const data = sessions.map((s) => {
    const live = s.orders.filter((o) => o.status !== "CANCELLED");
    const paid = live.filter((o) => o.status === "PAID");
    return {
      id: s.id,
      table: s.table,
      openedAt: s.openedAt.toISOString(),
      endedAt: (s.closedAt ?? s.lastActivityAt).toISOString(),
      wasClosed: s.status === "CLOSED",
      closeComplete: s.closeComplete,
      closedBy: s.closedBy,
      paymentSettled: s.paymentSettled,
      paymentMethod: s.paymentMethod,
      paymentMethodOther: s.paymentMethodOther,
      total: live.reduce((sum, o) => sum + o.total, 0),
      paidTotal: paid.reduce((sum, o) => sum + o.total, 0),
      orderCount: live.length,
      orders: s.orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        paymentMode: o.paymentMode,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((it) => ({ quantity: it.quantity, name: it.menuItem.name })),
      })),
    };
  });

  return NextResponse.json(data);
}
