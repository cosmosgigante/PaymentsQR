import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerAdmin } from "@/lib/account";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// POST — invitar un socio (Gmail) a la org. Si no existe en el sistema, se crea como A4.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: orgId } = await params;
  const org = await db.account.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Org no encontrada" }, { status: 404 });
  if (org.ownerEmail !== admin.email) return NextResponse.json({ error: "Solo el dueño puede invitar" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { email?: string; isPayingOwner?: boolean; paymentShare?: number };
  const email = body.email?.toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (!/@(gmail|googlemail)\.com$/i.test(email)) return NextResponse.json({ error: "Debe ser Gmail" }, { status: 400 });
  if (email === admin.email) return NextResponse.json({ error: "No podés invitarte a vos mismo" }, { status: 400 });

  // Si el invitado no existe en el sistema, lo creamos como A4
  const existing = await db.admin.findUnique({ where: { email } });
  if (!existing) {
    await db.admin.create({ data: { email, role: "OWNER" } });
  }

  // Crear o actualizar la invitación
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
  const inv = await db.orgInvitation.upsert({
    where: { accountId_inviteeEmail: { accountId: orgId, inviteeEmail: email } },
    create: {
      accountId: orgId, inviterEmail: admin.email, inviteeEmail: email,
      isPayingOwner: !!body.isPayingOwner,
      paymentShare: body.paymentShare ?? 0,
      expiresAt,
    },
    update: { status: "PENDING", isPayingOwner: !!body.isPayingOwner, paymentShare: body.paymentShare ?? 0, expiresAt },
  });

  await logActivity({
    accountId: orgId, restaurantId: null, actorType: "OWNER", actorName: admin.email,
    category: "CUENTA", action: "INVITE_SENT",
    detail: `${admin.email} invitó a ${email} a la org "${org.name}"`,
  });

  return NextResponse.json({ ok: true, invitationId: inv.id });
}

// GET — invitaciones pendientes para el usuario actual
export async function GET() {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const invitations = await db.orgInvitation.findMany({
    where: { inviteeEmail: admin.email, status: "PENDING", expiresAt: { gt: new Date() } },
    include: { account: { select: { id: true, name: true, ownerEmail: true } } },
  });

  return NextResponse.json({ invitations });
}
