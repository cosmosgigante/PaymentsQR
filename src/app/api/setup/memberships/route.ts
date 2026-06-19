import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { computeAccountPlan, isPlanType } from "@/lib/plans";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const admin = await db.admin.findUnique({ where: { email: user.email.toLowerCase() } });
  return admin?.role === "SUPERADMIN" ? user.email.toLowerCase() : null;
}

// GET — todas las orgs con solicitud de membresía pendiente
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const pending = await db.account.findMany({
    where: { pendingPlanType: { not: null } },
    select: {
      id: true, name: true, ownerEmail: true,
      pendingPlanType: true, isActive: true,
      subscriptionEndsAt: true,
      _count: { select: { restaurants: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ pending });
}

// PATCH — aprobar membresía de una org (por orgId)
export async function PATCH(req: NextRequest) {
  const saEmail = await requireSuperAdmin(req);
  if (!saEmail) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { orgId?: string };
  if (!body.orgId) return NextResponse.json({ error: "Falta orgId" }, { status: 400 });

  const org = await db.account.findUnique({ where: { id: body.orgId } });
  if (!org) return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  if (!org.pendingPlanType || !isPlanType(org.pendingPlanType)) {
    return NextResponse.json({ error: "Sin solicitud pendiente válida" }, { status: 400 });
  }

  const { totalArs, startedAt, endsAt } = computeAccountPlan(org.pendingPlanType, 0);
  await db.account.update({
    where: { id: body.orgId },
    data: {
      planType: org.pendingPlanType,
      priceArs: totalArs,
      subscriptionStartedAt: startedAt,
      subscriptionEndsAt: endsAt,
      isActive: true,
      canceledAt: null,
      pendingPlanType: null,
    },
  });

  await logActivity({
    accountId: body.orgId, restaurantId: null,
    actorType: "SUPERADMIN", actorName: saEmail,
    category: "CUENTA", action: "MEMBERSHIP_APPROVE",
    detail: `${saEmail} aprobó plan ${org.pendingPlanType} para org "${org.name ?? org.ownerEmail}"`,
  });

  return NextResponse.json({ ok: true });
}
