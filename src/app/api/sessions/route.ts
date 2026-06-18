import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/staff";

// Lista las mesas (sesiones) activas del restorán del personal logueado.
// Visible para quien puede ver Mozos o Cocina.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccess(session, "MOZOS") && !canAccess(session, "COCINA")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const sessions = await db.tableSession.findMany({
    where: { restaurantId: session.restaurantId, status: { in: ["OPEN", "PENDING_CONFIRM"] } },
    orderBy: { openedAt: "asc" },
    include: {
      table: { select: { number: true, label: true } },
      orders: { select: { id: true, status: true, total: true } },
    },
  });

  // Resumen liviano para el panel.
  const data = sessions.map((s) => {
    const live = s.orders.filter((o) => o.status !== "CANCELLED");
    return {
      id: s.id,
      status: s.status,
      table: s.table,
      openedAt: s.openedAt,
      orderCount: live.length,
      total: live.reduce((sum, o) => sum + o.total, 0),
    };
  });

  return NextResponse.json(data);
}
