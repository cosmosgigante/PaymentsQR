import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { logActivity } from "@/lib/activity";

// Quita un socio de la cuenta. Solo un admin FULL. No se puede quitar al dueño.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!accountAccess(ctx.admin, ctx.account).isFull) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  const partner = await db.admin.findFirst({
    where: { id, accountId: ctx.account.id },
    select: { id: true, email: true },
  });
  if (!partner) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (partner.email === ctx.account.ownerEmail) {
    return NextResponse.json({ error: "No podés quitar al dueño de la cuenta" }, { status: 400 });
  }

  await db.admin.delete({ where: { id } });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "PARTNER_REMOVE", detail: `Socio ${partner.email}`,
  });

  return NextResponse.json({ ok: true });
}
