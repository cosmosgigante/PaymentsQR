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

// GET — todas las organizaciones con sus miembros, membresía y restoranes
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const accounts = await db.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admins: { select: { email: true, role: true, accessScope: true } },
      members: { select: { email: true, role: true, isPayingOwner: true } },
      restaurants: { select: { id: true, name: true, slug: true, status: true, isActive: true } },
    },
  });

  const now = new Date();
  const orgs = accounts.map((a) => {
    const membershipActive = a.isActive && !!a.subscriptionEndsAt && a.subscriptionEndsAt > now;
    const daysLeft = a.subscriptionEndsAt ? Math.ceil((a.subscriptionEndsAt.getTime() - now.getTime()) / 86400000) : null;

    // Unir admins + accountMembers como una lista de participantes con su rol de pago
    const participants = [
      ...a.admins.map((m) => ({
        email: m.email,
        isOwner: m.email === a.ownerEmail,
        isPayingOwner: m.email === a.ownerEmail,
        accessScope: m.accessScope,
        source: "admin" as const,
      })),
      ...a.members
        .filter((m) => !a.admins.find((ad) => ad.email === m.email))
        .map((m) => ({
          email: m.email,
          isOwner: m.isPayingOwner,
          isPayingOwner: m.isPayingOwner,
          accessScope: null,
          source: "member" as const,
        })),
    ];

    return {
      id: a.id, name: a.name, ownerEmail: a.ownerEmail,
      planType: a.planType, priceArs: a.priceArs,
      subscriptionEndsAt: a.subscriptionEndsAt, membershipActive, daysLeft,
      isActive: a.isActive, pendingPlanType: a.pendingPlanType,
      canceledAt: a.canceledAt,
      participants,
      restaurants: a.restaurants,
    };
  });

  return NextResponse.json({ orgs });
}

// POST — crear org a nombre de un owner (y socios opcionales)
export async function POST(req: NextRequest) {
  const saEmail = await requireSuperAdmin(req);
  if (!saEmail) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    name?: string;
    ownerEmail?: string;
    planType?: string;            // si se quiere activar membresía directo
    restaurantName?: string;      // opcional: crear primer restorán
    slug?: string;
    partners?: { email: string; isPayingOwner: boolean }[]; // socios adicionales
  };

  const name = body.name?.trim().slice(0, 100);
  const ownerEmail = body.ownerEmail?.toLowerCase().trim();
  if (!name || !ownerEmail) return NextResponse.json({ error: "Faltan nombre y email del dueño" }, { status: 400 });
  if (!/@(gmail|googlemail)\.com$/i.test(ownerEmail)) return NextResponse.json({ error: "El dueño debe tener Gmail" }, { status: 400 });

  // Si el owner no existe en el sistema, crearlo como A4
  const ownerAdmin = await db.admin.findUnique({ where: { email: ownerEmail } });
  if (!ownerAdmin) {
    await db.admin.create({ data: { email: ownerEmail, role: "OWNER" } });
  }

  // Calcular sub si se pasa planType
  let subData = {};
  if (body.planType && isPlanType(body.planType)) {
    const { totalArs, startedAt, endsAt } = computeAccountPlan(body.planType, 0);
    subData = { planType: body.planType, priceArs: totalArs, subscriptionStartedAt: startedAt, subscriptionEndsAt: endsAt, isActive: true, paymentSource: "MANUAL" };
  }

  // Crear restaurante si se pasa nombre + slug
  const restData = body.restaurantName && body.slug
    ? { create: [{ name: body.restaurantName.slice(0, 100), slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60), status: "ACTIVE" }] }
    : undefined;

  const account = await db.account.create({
    data: {
      ownerEmail, name, isActive: !!body.planType, ...subData,
      admins: { create: [{ email: ownerEmail, role: "OWNER" }] },
      ...(restData ? { restaurants: restData } : {}),
    },
    include: { restaurants: { select: { id: true } } },
  });

  // Si el owner ya tenía accountId null, actualizarlo
  if (!ownerAdmin?.accountId) {
    await db.admin.update({ where: { email: ownerEmail }, data: { accountId: account.id } }).catch(() => {});
  } else {
    // Si ya tenía otra cuenta, vincular via AccountMember
    await db.accountMember.upsert({
      where: { accountId_email: { accountId: account.id, email: ownerEmail } },
      create: { accountId: account.id, email: ownerEmail, role: "OWNER", isPayingOwner: true },
      update: {},
    });
  }

  // Agregar socios
  const partners = body.partners ?? [];
  for (const p of partners) {
    const pe = p.email?.toLowerCase().trim();
    if (!pe || !/@(gmail|googlemail)\.com$/i.test(pe)) continue;
    const pa = await db.admin.findUnique({ where: { email: pe } });
    if (!pa) await db.admin.create({ data: { email: pe, role: "OWNER" } });
    await db.accountMember.upsert({
      where: { accountId_email: { accountId: account.id, email: pe } },
      create: { accountId: account.id, email: pe, role: "MEMBER", isPayingOwner: p.isPayingOwner },
      update: { isPayingOwner: p.isPayingOwner },
    });
  }

  await logActivity({
    accountId: account.id, restaurantId: account.restaurants[0]?.id ?? null,
    actorType: "SUPERADMIN", actorName: saEmail,
    category: "CUENTA", action: "ORG_CREATE",
    detail: `${saEmail} creó org "${name}" para ${ownerEmail}${body.planType ? ` (plan ${body.planType})` : " (sin membresía)"}`,
  });

  return NextResponse.json({ ok: true, orgId: account.id }, { status: 201 });
}
