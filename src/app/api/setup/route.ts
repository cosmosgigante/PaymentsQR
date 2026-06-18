import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { computeAccountPlan, isPlanType } from "@/lib/plans";

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const admin = await db.admin.findUnique({ where: { email: user.email.toLowerCase() } });
  if (admin?.role !== "SUPERADMIN") return null;
  return admin;
}

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const restaurants = await db.restaurant.findMany({
    include: {
      admins: { select: { email: true, role: true, passwordHash: true } },
      account: { select: { id: true, ownerEmail: true, planType: true, priceArs: true, subscriptionEndsAt: true, isActive: true } },
      _count: { select: { tables: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const sanitized = restaurants.map((r) => ({
    ...r,
    admins: r.admins.map(({ passwordHash, ...a }) => ({
      ...a,
      hasPassword: !!passwordHash,
    })),
  }));

  return NextResponse.json({ restaurants: sanitized });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`setup-create:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const { restaurantName, slug, adminEmail, planType } = body as {
    restaurantName?: string;
    slug?: string;
    adminEmail?: string;
    planType?: string;
  };

  if (!restaurantName || !slug || !adminEmail) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (!isPlanType(planType)) {
    return NextResponse.json({ error: "Elegí un plan" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(adminEmail))) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  // Los Clientes A se agendan SÍ O SÍ con Gmail (autenticación con Google).
  if (!/@(gmail|googlemail)\.com$/i.test(String(adminEmail).trim())) {
    return NextResponse.json({ error: "El Cliente A debe registrarse con un correo de Gmail" }, { status: 400 });
  }

  const cleanSlug = String(slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (cleanSlug.length < 2) {
    return NextResponse.json({ error: "Slug demasiado corto" }, { status: 400 });
  }

  const ownerEmail = String(adminEmail).toLowerCase().trim();
  const cleanName = String(restaurantName).slice(0, 100);

  const existing = await db.restaurant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return NextResponse.json({ error: "Ese slug ya está en uso" }, { status: 409 });

  const adminExists = await db.admin.findUnique({ where: { email: ownerEmail } });
  if (adminExists) return NextResponse.json({ error: "Ese email ya tiene una cuenta" }, { status: 409 });

  const accountExists = await db.account.findUnique({ where: { ownerEmail } });
  if (accountExists) return NextResponse.json({ error: "Ese email ya tiene una cuenta" }, { status: 409 });

  // El plan base incluye 1 restorán (sin sucursales extra al crear)
  const { totalArs, startedAt, endsAt } = computeAccountPlan(planType, 0);

  const account = await db.account.create({
    data: {
      ownerEmail,
      name: cleanName,
      planType,
      priceArs: totalArs,
      subscriptionStartedAt: startedAt,
      subscriptionEndsAt: endsAt,
      paymentSource: "MANUAL",
      isActive: true,
      // Admin general de la cuenta (sin restaurantId: opera todos los restoranes de la cuenta)
      admins: {
        create: { email: ownerEmail, role: "OWNER" },
      },
      // Primer restorán, ya habilitado
      restaurants: {
        create: { name: cleanName, slug: cleanSlug, status: "ACTIVE" },
      },
    },
    include: { restaurants: { select: { id: true } } },
  });

  return NextResponse.json({ ok: true, accountId: account.id, restaurantId: account.restaurants[0]?.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    restaurantId?: string;
    accountId?: string;
    isActive?: boolean;
    subscriptionEndsAt?: string | null;
    status?: string;
  };

  // Actualización a nivel CUENTA (suscripción / suspensión del cliente)
  if (body.accountId) {
    const data: { isActive?: boolean; subscriptionEndsAt?: Date | null } = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.subscriptionEndsAt !== undefined) {
      data.subscriptionEndsAt = body.subscriptionEndsAt ? new Date(body.subscriptionEndsAt) : null;
    }
    const updated = await db.account.update({ where: { id: body.accountId }, data });
    return NextResponse.json({ ok: true, isActive: updated.isActive, subscriptionEndsAt: updated.subscriptionEndsAt });
  }

  // Actualización a nivel RESTORÁN (habilitar / suspender una sucursal)
  if (!body.restaurantId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const data: { isActive?: boolean; status?: string } = {};
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.status === "ACTIVE" || body.status === "PENDING") data.status = body.status;

  const updated = await db.restaurant.update({ where: { id: body.restaurantId }, data });
  return NextResponse.json({ ok: true, isActive: updated.isActive, status: updated.status });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { restaurantId } = await req.json().catch(() => ({})) as { restaurantId?: string };
  if (!restaurantId) return NextResponse.json({ error: "Falta restaurantId" }, { status: 400 });

  await db.restaurant.delete({ where: { id: restaurantId } });
  return NextResponse.json({ ok: true });
}
