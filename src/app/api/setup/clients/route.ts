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

// Clase calculada de un Admin dentro del sistema.
// A  = responsable de pago de ≥1 cuenta activa con subscripción vigente
// A2 = miembro de una cuenta pero no es el ownerEmail
// A3 = sin cuenta (perfil sin sociedad ni membresía)
function calcClass(email: string, accounts: { ownerEmail: string; isActive: boolean; subscriptionEndsAt: Date | null }[]): "A" | "A2" | "A3" {
  const now = new Date();
  const owned = accounts.filter((a) => a.ownerEmail === email && a.isActive && a.subscriptionEndsAt && a.subscriptionEndsAt > now);
  if (owned.length > 0) return "A";
  if (accounts.length > 0) return "A2";
  return "A3";
}

// GET — todos los perfiles (A/A2/A3) con su membresía y restoranes
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Traer todos los Admins que NO son SUPERADMIN
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

  const now = new Date();
  const clients = admins.map((a) => {
    const acc = a.account;
    const subActive = acc ? acc.isActive && !!acc.subscriptionEndsAt && acc.subscriptionEndsAt > now : false;
    const clientClass = calcClass(a.email, acc ? [{ ownerEmail: acc.ownerEmail, isActive: acc.isActive, subscriptionEndsAt: acc.subscriptionEndsAt }] : []);
    const daysLeft = acc?.subscriptionEndsAt ? Math.ceil((acc.subscriptionEndsAt.getTime() - now.getTime()) / 86400000) : null;

    return {
      email: a.email,
      clientClass,
      accountId: acc?.id ?? null,
      accountName: acc?.name ?? null,
      ownerEmail: acc?.ownerEmail ?? null,
      isOwner: acc?.ownerEmail === a.email,
      planType: acc?.planType ?? null,
      priceArs: acc?.priceArs ?? null,
      subscriptionEndsAt: acc?.subscriptionEndsAt ?? null,
      isActive: acc?.isActive ?? false,
      membershipActive: subActive,
      daysLeft,
      canceledAt: acc?.canceledAt ?? null,
      members: acc?.admins ?? [],
      restaurants: acc?.restaurants ?? [],
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

  // A3 — perfil sin cuenta ni membresía
  if (type === "A3") {
    const admin = await db.admin.create({ data: { email, role: "OWNER" } });
    await logActivity({ accountId: null, restaurantId: null, actorType: "SUPERADMIN", actorName: sa.email, category: "CUENTA", action: "CLIENT_CREATE", detail: `Cliente A3 creado: ${email}` });
    return NextResponse.json({ ok: true, email: admin.email, clientClass: "A3" }, { status: 201 });
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
