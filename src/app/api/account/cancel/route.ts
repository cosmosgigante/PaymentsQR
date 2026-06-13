import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { logActivity } from "@/lib/activity";

// El cliente cancela su plan. La cuenta sigue activa hasta subscriptionEndsAt;
// solo se marca canceledAt (no se renueva). Reversible enviando { undo: true }.
export async function POST(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!accountAccess(ctx.admin, ctx.account).isFull) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { confirm?: string; undo?: boolean };

  if (body.undo) {
    await db.account.update({ where: { id: ctx.account.id }, data: { canceledAt: null } });
    return NextResponse.json({ ok: true, canceledAt: null });
  }

  // Confirmación escrita obligatoria
  if ((body.confirm ?? "").trim().toLowerCase() !== "cancelar plan") {
    return NextResponse.json({ error: "Escribí \"cancelar plan\" para confirmar" }, { status: 400 });
  }

  const updated = await db.account.update({
    where: { id: ctx.account.id },
    data: { canceledAt: new Date() },
    select: { canceledAt: true },
  });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "PLAN_CANCEL", detail: "El cliente canceló el plan",
  });

  return NextResponse.json({ ok: true, canceledAt: updated.canceledAt });
}
