import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageAny } from "@/lib/staff";
import { logActivity } from "@/lib/activity";
import { emitEvent } from "@/lib/events";

// Confirmar o cerrar una mesa. Requiere Gestionar en Cocina o Mozos
// (mozos y caja/admin, según lo definido).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageAny(session, ["COCINA", "MOZOS"])) {
    return NextResponse.json({ error: "No tenés permiso para gestionar mesas" }, { status: 403 });
  }

  const { id } = await params;
  let body: { action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const action = body.action;
  if (action !== "confirm" && action !== "close") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  // IDOR: la mesa debe ser del restorán del personal.
  const ts = await db.tableSession.findFirst({
    where: { id, restaurantId: session.restaurantId },
    include: { table: { select: { number: true } } },
  });
  if (!ts) return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });

  const now = new Date();
  const data = action === "confirm"
    ? { status: "OPEN", confirmedAt: now, lastActivityAt: now }
    : { status: "CLOSED", closedAt: now };

  await db.tableSession.update({ where: { id }, data });

  emitEvent(session.restaurantId, { type: "SESSION_UPDATED", sessionId: id, action });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "PEDIDOS", action: action === "confirm" ? "TABLE_CONFIRM" : "TABLE_CLOSE",
    detail: `Mesa ${ts.table.number} ${action === "confirm" ? "confirmada" : "cerrada"}`,
  });

  return NextResponse.json({ ok: true });
}
