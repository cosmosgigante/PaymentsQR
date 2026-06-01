import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

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

  const { restaurantName, slug, adminEmail } = body as {
    restaurantName?: string;
    slug?: string;
    adminEmail?: string;
  };

  if (!restaurantName || !slug || !adminEmail) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(adminEmail))) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const cleanSlug = String(slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (cleanSlug.length < 2) {
    return NextResponse.json({ error: "Slug demasiado corto" }, { status: 400 });
  }

  const existing = await db.restaurant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return NextResponse.json({ error: "Ese slug ya está en uso" }, { status: 409 });

  const adminExists = await db.admin.findUnique({ where: { email: String(adminEmail).toLowerCase().trim() } });
  if (adminExists) return NextResponse.json({ error: "Ese email ya tiene una cuenta" }, { status: 409 });

  const restaurant = await db.restaurant.create({
    data: {
      name: String(restaurantName).slice(0, 100),
      slug: cleanSlug,
      admins: {
        create: {
          email: String(adminEmail).toLowerCase().trim(),
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({ ok: true, restaurantId: restaurant.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { restaurantId, isActive } = await req.json().catch(() => ({})) as { restaurantId?: string; isActive?: boolean };
  if (!restaurantId || isActive === undefined) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const updated = await db.restaurant.update({ where: { id: restaurantId }, data: { isActive } });
  return NextResponse.json({ ok: true, isActive: updated.isActive });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { restaurantId } = await req.json().catch(() => ({})) as { restaurantId?: string };
  if (!restaurantId) return NextResponse.json({ error: "Falta restaurantId" }, { status: 400 });

  await db.restaurant.delete({ where: { id: restaurantId } });
  return NextResponse.json({ ok: true });
}
