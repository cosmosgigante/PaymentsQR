import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { computeAccountPlan, isPlanType } from "@/lib/plans";

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

// PATCH — intervenciones sobre un perfil de cliente
// actions: "upgrade_to_A" | "set_membership" | "cancel_membership" | "toggle_active" | "create_restaurant"
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const saEmail = await requireSuperAdmin(req);
  if (!saEmail) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email } = await params;
  const target = decodeURIComponent(email).toLowerCase();

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    planType?: string;
    months?: number;
    restaurantName?: string;
    slug?: string;
    isActive?: boolean;
  };

  const admin = await db.admin.findUnique({ where: { email: target }, include: { account: true } });
  if (!admin) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  // ── Upgrade A3 → A (crear cuenta y primer restorán)
  if (body.action === "upgrade_to_A") {
    if (admin.accountId) return NextResponse.json({ error: "Ya tiene cuenta" }, { status: 400 });
    if (!body.restaurantName || !body.slug || !isPlanType(body.planType)) {
      return NextResponse.json({ error: "Faltan restaurantName, slug o planType" }, { status: 400 });
    }
    if (await db.account.findUnique({ where: { ownerEmail: target } })) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
    }
    const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    if (await db.restaurant.findUnique({ where: { slug: cleanSlug } })) {
      return NextResponse.json({ error: "Slug ya en uso" }, { status: 409 });
    }
    const { totalArs, startedAt, endsAt } = computeAccountPlan(body.planType, 0);
    const acc = await db.account.create({
      data: {
        ownerEmail: target, name: body.restaurantName.slice(0, 100),
        planType: body.planType, priceArs: totalArs,
        subscriptionStartedAt: startedAt, subscriptionEndsAt: endsAt,
        paymentSource: "MANUAL", isActive: true,
        restaurants: { create: { name: body.restaurantName.slice(0, 100), slug: cleanSlug, status: "ACTIVE" } },
      },
      include: { restaurants: { select: { id: true } } },
    });
    await db.admin.update({ where: { email: target }, data: { accountId: acc.id } });
    await logActivity({ accountId: acc.id, restaurantId: acc.restaurants[0]?.id ?? null, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "CLIENT_UPGRADE", detail: `${target} promovido de A3 a A (plan ${body.planType})` });
    return NextResponse.json({ ok: true });
  }

  // ── Intervenir membresía (cambiar plan / extender)
  if (body.action === "set_membership") {
    if (!admin.accountId) return NextResponse.json({ error: "Sin cuenta para modificar membresía" }, { status: 400 });
    if (body.planType && !isPlanType(body.planType)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const acc = admin.account!;
    let endsAt: Date;
    if (body.months) {
      // Extender desde hoy o desde la fecha actual si sigue vigente
      const base = acc.subscriptionEndsAt && acc.subscriptionEndsAt > new Date() ? new Date(acc.subscriptionEndsAt) : new Date();
      base.setMonth(base.getMonth() + body.months);
      endsAt = base;
    } else if (body.planType && isPlanType(body.planType)) {
      const { totalArs, startedAt, endsAt: newEnd } = computeAccountPlan(body.planType, 0);
      endsAt = newEnd;
      await db.account.update({ where: { id: admin.accountId }, data: { planType: body.planType, priceArs: totalArs, subscriptionStartedAt: startedAt, subscriptionEndsAt: newEnd, isActive: true, canceledAt: null } });
      await logActivity({ accountId: admin.accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "MEMBERSHIP_CHANGE", detail: `Plan cambiado a ${body.planType} para ${target}` });
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ error: "Especificá planType o months" }, { status: 400 });
    }
    await db.account.update({ where: { id: admin.accountId }, data: { subscriptionEndsAt: endsAt, isActive: true, canceledAt: null } });
    await logActivity({ accountId: admin.accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "MEMBERSHIP_EXTEND", detail: `Membresía de ${target} extendida hasta ${endsAt.toISOString().slice(0, 10)}` });
    return NextResponse.json({ ok: true });
  }

  // ── Cancelar membresía
  if (body.action === "cancel_membership") {
    if (!admin.accountId) return NextResponse.json({ error: "Sin cuenta" }, { status: 400 });
    await db.account.update({ where: { id: admin.accountId }, data: { isActive: false, canceledAt: new Date() } });
    await logActivity({ accountId: admin.accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "MEMBERSHIP_CANCEL", detail: `Membresía de ${target} cancelada por superadmin` });
    return NextResponse.json({ ok: true });
  }

  // ── Activar/suspender cuenta
  if (body.action === "toggle_active") {
    if (!admin.accountId) return NextResponse.json({ error: "Sin cuenta" }, { status: 400 });
    const updated = await db.account.update({ where: { id: admin.accountId }, data: { isActive: !!body.isActive } });
    await logActivity({ accountId: admin.accountId, restaurantId: null, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "CLIENT_TOGGLE", detail: `Cuenta de ${target} ${updated.isActive ? "activada" : "suspendida"}` });
    return NextResponse.json({ ok: true });
  }

  // ── Crear restorán para cliente existente (fix bug juli + flujo normal)
  if (body.action === "create_restaurant") {
    if (!admin.accountId) return NextResponse.json({ error: "El cliente no tiene cuenta. Primero promovelo a A." }, { status: 400 });
    if (!body.restaurantName || !body.slug) return NextResponse.json({ error: "Faltan restaurantName y slug" }, { status: 400 });
    const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    if (await db.restaurant.findUnique({ where: { slug: cleanSlug } })) {
      return NextResponse.json({ error: "Slug ya en uso" }, { status: 409 });
    }
    const r = await db.restaurant.create({
      data: { accountId: admin.accountId, name: body.restaurantName.slice(0, 100), slug: cleanSlug, status: "ACTIVE" },
    });
    await logActivity({ accountId: admin.accountId, restaurantId: r.id, actorType: "SUPERADMIN", actorName: saEmail, category: "CUENTA", action: "RESTAURANT_CREATE", detail: `Restorán "${r.name}" creado para ${target}` });
    return NextResponse.json({ ok: true, restaurantId: r.id });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
