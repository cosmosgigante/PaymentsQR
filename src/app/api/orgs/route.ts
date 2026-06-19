import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveServerAdmin } from "@/lib/account";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// GET — todas las organizaciones del usuario logueado (como owner o miembro)
export async function GET() {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date();

  // Org primaria (via Admin.accountId)
  const primary = admin.accountId && admin.account ? [{
    id: admin.account.id,
    name: admin.account.name,
    ownerEmail: admin.account.ownerEmail,
    isOwner: admin.account.ownerEmail === admin.email,
    planType: admin.account.planType,
    isActive: admin.account.isActive,
    membershipActive: admin.account.isActive && !!admin.account.subscriptionEndsAt && admin.account.subscriptionEndsAt > now,
    subscriptionEndsAt: admin.account.subscriptionEndsAt?.toISOString() ?? null,
    pendingPlanType: admin.account.pendingPlanType ?? null,
    restaurantCount: 0, // se llena abajo
  }] : [];

  // Orgs adicionales via AccountMember
  const extra = await db.accountMember.findMany({
    where: { email: admin.email },
    include: {
      account: {
        select: { id: true, name: true, ownerEmail: true, isActive: true, planType: true, subscriptionEndsAt: true, pendingPlanType: true },
      },
    },
  });

  const extraOrgs = extra
    .filter((m) => !primary.find((p) => p.id === m.accountId))
    .map((m) => ({
      id: m.account.id,
      name: m.account.name,
      ownerEmail: m.account.ownerEmail,
      isOwner: m.isPayingOwner,
      planType: m.account.planType,
      isActive: m.account.isActive,
      membershipActive: m.account.isActive && !!m.account.subscriptionEndsAt && m.account.subscriptionEndsAt > now,
      subscriptionEndsAt: m.account.subscriptionEndsAt?.toISOString() ?? null,
      pendingPlanType: m.account.pendingPlanType ?? null,
      restaurantCount: 0,
    }));

  const allOrgs = [...primary, ...extraOrgs];

  // Contar restoranes por org
  if (allOrgs.length > 0) {
    const counts = await db.restaurant.groupBy({ by: ["accountId"], where: { accountId: { in: allOrgs.map((o) => o.id) } }, _count: { id: true } });
    const countMap = Object.fromEntries(counts.map((c) => [c.accountId, c._count.id]));
    allOrgs.forEach((o) => { o.restaurantCount = countMap[o.id] ?? 0; });
  }

  return NextResponse.json({ orgs: allOrgs });
}

// POST — crear una nueva organización (gratis; membresía se activa luego)
export async function POST(req: NextRequest) {
  const admin = await resolveServerAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim().slice(0, 100);
  if (!name) return NextResponse.json({ error: "Falta el nombre de la organización" }, { status: 400 });

  // Si ya tiene una cuenta como dueño, la org extra va via AccountMember
  const existingOwner = await db.account.findUnique({ where: { ownerEmail: admin.email } });

  let org;
  if (!existingOwner) {
    // Primer org: crear Account + actualizar Admin.accountId
    org = await db.account.create({
      data: { ownerEmail: admin.email, name, isActive: false },
    });
    await db.admin.update({ where: { email: admin.email }, data: { accountId: org.id } });
  } else {
    // Segunda org o más: crear Account y vincular via AccountMember
    org = await db.account.create({
      data: { ownerEmail: admin.email, name, isActive: false },
    });
    await db.accountMember.upsert({
      where: { accountId_email: { accountId: org.id, email: admin.email } },
      create: { accountId: org.id, email: admin.email, role: "OWNER", isPayingOwner: true },
      update: {},
    });
  }

  await logActivity({
    accountId: org.id, restaurantId: null, actorType: "OWNER", actorName: admin.email,
    category: "CUENTA", action: "ORG_CREATE",
    detail: `Organización "${name}" creada por ${admin.email}`,
  });

  return NextResponse.json({ ok: true, orgId: org.id }, { status: 201 });
}
