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
  return admin?.role === "SUPERADMIN" ? { admin, email: user.email.toLowerCase() } : null;
}

// Clases de cliente (calculadas, no guardadas):
// A  = responsable de pago en ≥1 cuenta activa y con subscripción vigente
// A2 = en una cuenta pero no paga (socio que no es ownerEmail)
// A3 = en múltiples cuentas/sociedades, siendo A en algunas y A2 en otras
// A4 = sin sociedad ni membresía (perfil puro, sin vínculo a ninguna cuenta)
type ClientClass = "A" | "A2" | "A3" | "A4";

function calcClass(email: string, memberships: { ownerEmail: string; isActive: boolean; subscriptionEndsAt: Date | null }[]): ClientClass {
  const now = new Date();
  if (memberships.length === 0) return "A4";
  const payingOwner = memberships.filter((a) => a.ownerEmail === email && a.isActive && a.subscriptionEndsAt && a.subscriptionEndsAt > now);
  const nonPayingMember = memberships.filter((a) => a.ownerEmail !== email);
  if (payingOwner.length > 0 && nonPayingMember.length > 0) return "A3"; // mezcla: paga en algunos, A2 en otros
  if (payingOwner.length > 0) return "A";
  return "A2";
}

// GET — todos los perfiles con su clase A/A2/A3/A4 y detalle de membresías
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Todos los Admins no-superadmin
  const admins = await db.admin.findMany({
    where: { role: { not: "SUPERADMIN" } },
    orderBy: { email: "asc" },
    include: {
      account: {
        include: {
          restaurants: { select: { id: true, name: true, slug: true, isActive: true, status: true, _count: { select: { tables: true, orders: true } } }, orderBy: { createdAt: "asc" } },
          admins: { select: { email: true, role: true, accessScope: true } },
        },
      },
    },
  });

  // Membresías adicionales via AccountMember (para detectar A3: en múltiples cuentas)
  const allEmails = admins.map((a) => a.email);
  const extraMemberships = await db.accountMember.findMany({
    where: { email: { in: allEmails } },
    include: { account: { select: { id: true, ownerEmail: true, name: true, isActive: true, subscriptionEndsAt: true } } },
  });

  const now = new Date();
  const clients = admins.map((a) => {
    const acc = a.account;

    // Construir lista de todas las membresías del email (la cuenta directa + AccountMember)
    type Membership = { accountId: string; accountName: string | null; ownerEmail: string; isActive: boolean; subscriptionEndsAt: Date | null; isPayingOwner: boolean };
    const memberships: Membership[] = [];
    if (acc) memberships.push({ accountId: acc.id, accountName: acc.name, ownerEmail: acc.ownerEmail, isActive: acc.isActive, subscriptionEndsAt: acc.subscriptionEndsAt, isPayingOwner: acc.ownerEmail === a.email });
    extraMemberships.filter((m) => m.email === a.email).forEach((m) => {
      if (!memberships.find((x) => x.accountId === m.accountId)) {
        memberships.push({ accountId: m.accountId, accountName: m.account.name, ownerEmail: m.account.ownerEmail, isActive: m.account.isActive, subscriptionEndsAt: m.account.subscriptionEndsAt, isPayingOwner: m.isPayingOwner });
      }
    });

    const clientClass = calcClass(a.email, memberships.map((m) => ({ ownerEmail: m.isPayingOwner ? a.email : m.ownerEmail, isActive: m.isActive, subscriptionEndsAt: m.subscriptionEndsAt })));

    // Cuenta principal (donde es owner o la primera)
    const primaryAcc = memberships.find((m) => m.ownerEmail === a.email) ?? memberships[0] ?? null;
    const subActive = primaryAcc ? primaryAcc.isActive && !!primaryAcc.subscriptionEndsAt && primaryAcc.subscriptionEndsAt > now : false;
    const daysLeft = primaryAcc?.subscriptionEndsAt ? Math.ceil((primaryAcc.subscriptionEndsAt.getTime() - now.getTime()) / 86400000) : null;

    return {
      email: a.email,
      clientClass,
      accountId: acc?.id ?? null,
      accountName: acc?.name ?? null,
      ownerEmail: acc?.ownerEmail ?? null,
      isOwner: acc?.ownerEmail === a.email,
      planType: acc?.planType ?? null,
      priceArs: acc?.priceArs ?? null,
      subscriptionEndsAt: primaryAcc?.subscriptionEndsAt ?? null,
      isActive: primaryAcc?.isActive ?? false,
      membershipActive: subActive,
      daysLeft,
      canceledAt: acc?.canceledAt ?? null,
      members: acc?.admins ?? [],
      restaurants: acc?.restaurants ?? [],
      // Para A3: detalle de todas sus sociedades
      societyMemberships: memberships.map((m) => ({
        accountId: m.accountId,
        accountName: m.accountName,
        role: m.ownerEmail === a.email || m.isPayingOwner ? "A" : "A2",
        membershipActive: m.isActive && !!m.subscriptionEndsAt && m.subscriptionEndsAt > now,
      })),
    };
  });

  return NextResponse.json({ clients });
}

// POST — crear cliente A3 (sin cuenta), A2 (vincular a cuenta), o A (con cuenta nueva)
export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    type?: "A" | "A2" | "A3";
    email?: string;
    accountId?: string;       // solo para A2
    restaurantName?: string;  // para A (primer restorán)
    slug?: string;
    planType?: string;
  };

  const email = body.email?.toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!/@(gmail|googlemail)\.com$/i.test(email)) {
    return NextResponse.json({ error: "Debe ser Gmail" }, { status: 400 });
  }

  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Ese email ya existe en el sistema" }, { status: 409 });

  const type = body.type ?? "A";

  // A4 — perfil sin cuenta ni membresía
  if (type === "A3") {
    const admin = await db.admin.create({ data: { email, role: "OWNER" } });
    await logActivity({ accountId: null, restaurantId: null, actorType: "SUPERADMIN", actorName: sa.email, category: "CUENTA", action: "CLIENT_CREATE", detail: `Cliente A4 creado: ${email}` });
    return NextResponse.json({ ok: true, email: admin.email, clientClass: "A4" }, { status: 201 });
  }

  // A2 — vincular a cuenta existente como socio
  if (type === "A2") {
    if (!body.accountId) return NextResponse.json({ error: "Falta accountId para A2" }, { status: 400 });
    const acc = await db.account.findUnique({ where: { id: body.accountId } });
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    const admin = await db.admin.create({ data: { email, role: "OWNER", accountId: body.accountId, accessScope: "FULL" } });
    await logActivity({ accountId: body.accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: sa.email, category: "CUENTA", action: "CLIENT_CREATE", detail: `Socio A2 ${email} vinculado a cuenta ${acc.name ?? acc.ownerEmail}` });
    return NextResponse.json({ ok: true, email: admin.email, clientClass: "A2" }, { status: 201 });
  }

  // A — cuenta nueva con primer restorán
  if (!body.restaurantName || !body.slug || !isPlanType(body.planType)) {
    return NextResponse.json({ error: "Faltan datos para crear Cliente A (restaurantName, slug, planType)" }, { status: 400 });
  }
  const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (await db.restaurant.findUnique({ where: { slug: cleanSlug } })) {
    return NextResponse.json({ error: "Ese slug ya está en uso" }, { status: 409 });
  }
  if (await db.account.findUnique({ where: { ownerEmail: email } })) {
    return NextResponse.json({ error: "Ese email ya tiene una cuenta" }, { status: 409 });
  }
  const { totalArs, startedAt, endsAt } = computeAccountPlan(body.planType, 0);
  const acc = await db.account.create({
    data: {
      ownerEmail: email, name: body.restaurantName.slice(0, 100),
      planType: body.planType, priceArs: totalArs,
      subscriptionStartedAt: startedAt, subscriptionEndsAt: endsAt,
      paymentSource: "MANUAL", isActive: true,
      admins: { create: { email, role: "OWNER" } },
      restaurants: { create: { name: body.restaurantName.slice(0, 100), slug: cleanSlug, status: "ACTIVE" } },
    },
    include: { restaurants: { select: { id: true } } },
  });
  await logActivity({ accountId: acc.id, restaurantId: acc.restaurants[0]?.id ?? null, actorType: "SUPERADMIN", actorName: sa.email, category: "CUENTA", action: "CLIENT_CREATE", detail: `Cliente A creado: ${email} (${body.planType})` });
  return NextResponse.json({ ok: true, email, clientClass: "A", accountId: acc.id }, { status: 201 });
}
