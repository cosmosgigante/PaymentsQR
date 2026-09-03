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
  let body: { action?: string; settled?: boolean; method?: string; methodOther?: string };
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
  let data: Record<string, unknown>;
  let detail: string;

  if (action === "confirm") {
    data = { status: "OPEN", confirmedAt: now, lastActivityAt: now };
    detail = `Mesa ${ts.table.number} confirmada`;
  } else {
    // Cierre de cuenta/sesión: datos de cobro OPCIONALES (se puede cerrar sin
    // completarlos → queda como "incompleta"). Si pagaron por la app, ya quedó
    // registrado en las órdenes/pagos; esto captura lo que no fue digital.
    const method = ["EFECTIVO", "VIRTUAL", "OTRO"].includes(String(body.method)) ? String(body.method) : null;
    const settled = typeof body.settled === "boolean" ? body.settled : null;
    const methodOther = method === "OTRO" && typeof body.methodOther === "string"
      ? body.methodOther.trim().slice(0, 80) : null;
    // "Completa" = respondió si cobró (y, si cobró, con qué método).
    const complete = settled !== null && (settled === false || method !== null);
    data = {
      status: "CLOSED", closedAt: now,
      closedBy: session.actorName ?? session.role,
      paymentSettled: settled,
      paymentMethod: settled ? method : null,
      paymentMethodOther: settled ? methodOther : null,
      closeComplete: complete,
    };
    const cobro = settled === null ? "sin datos de cobro (incompleta)"
      : settled === false ? "sin cobro registrado"
      : `cobrado · ${method === "OTRO" ? `otro${methodOther ? ` (${methodOther})` : ""}` : (method ? method.toLowerCase() : "método sin especificar")}`;
    detail = `Mesa ${ts.table.number} cerrada · ${cobro}`;
  }

  await db.tableSession.update({ where: { id }, data });

  emitEvent(session.restaurantId, { type: "SESSION_UPDATED", sessionId: id, action });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "PEDIDOS", action: action === "confirm" ? "TABLE_CONFIRM" : "TABLE_CLOSE",
    detail,
  });

  return NextResponse.json({ ok: true });
}
