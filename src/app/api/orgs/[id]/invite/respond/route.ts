import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerAdmin } from "@/lib/account";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: orgId } = await params;
  const { invitationId, action } = await req.json().catch(() => ({})) as { invitationId?: string; action?: string };

  if (!invitationId || (action !== "accept" && action !== "reject")) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const inv = await db.orgInvitation.findFirst({
    where: { id: invitationId, accountId: orgId, inviteeEmail: admin.email, status: "PENDING" },
  });
  if (!inv) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });

  await db.orgInvitation.update({ where: { id: invitationId }, data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" } });

  if (action === "accept") {
    // Vincular como miembro
    await db.accountMember.upsert({
      where: { accountId_email: { accountId: orgId, email: admin.email } },
      create: { accountId: orgId, email: admin.email, role: "MEMBER", isPayingOwner: inv.isPayingOwner },
      update: { isPayingOwner: inv.isPayingOwner },
    });
    await logActivity({ accountId: orgId, restaurantId: null, actorType: "OWNER", actorName: admin.email, category: "CUENTA", action: "INVITE_ACCEPTED", detail: `${admin.email} aceptó la invitación` });
  }

  return NextResponse.json({ ok: true });
}
