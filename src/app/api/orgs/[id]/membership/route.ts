import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerAdmin, accountAccess } from "@/lib/account";
import { logActivity } from "@/lib/activity";
import { isPlanType } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST — solicitar activación de membresía (queda pendiente de aprobación manual/MP)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: orgId } = await params;
  const org = await db.account.findFirst({
    where: { id: orgId },
    include: { admins: { select: { email: true } } },
  });
  if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });

  // Solo el owner o miembro con isPayingOwner puede solicitar membresía
  const isMember = org.admins.some((a) => a.email === admin.email) || await db.accountMember.findFirst({ where: { accountId: orgId, email: admin.email } });
  if (!isMember) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { planType?: string };
  if (!isPlanType(body.planType)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  await db.account.update({ where: { id: orgId }, data: { pendingPlanType: body.planType } });

  await logActivity({
    accountId: orgId, restaurantId: null, actorType: "OWNER", actorName: admin.email,
    category: "CUENTA", action: "MEMBERSHIP_REQUEST",
    detail: `${admin.email} solicitó plan ${body.planType} para org "${org.name}"`,
  });

  return NextResponse.json({ ok: true });
}
