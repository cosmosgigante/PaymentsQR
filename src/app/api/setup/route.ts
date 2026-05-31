import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  // Max 5 intentos por IP por hora
  if (!rateLimit(`setup:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json({ error: "Setup deshabilitado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  const { secret, restaurantName, slug, adminEmail, adminPassword } = body as {
    secret?: string;
    restaurantName?: string;
    slug?: string;
    adminEmail?: string;
    adminPassword?: string;
  };

  if (!secret || typeof secret !== "string") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Comparación timing-safe para evitar ataques de tiempo al adivinar el secret
  const secretOk = (() => {
    try {
      const a = Buffer.from(secret.padEnd(setupSecret.length));
      const b = Buffer.from(setupSecret);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();

  if (!secretOk) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const count = await db.restaurant.count();
  if (count > 0) {
    return NextResponse.json({ error: "El sistema ya está configurado" }, { status: 403 });
  }

  if (!restaurantName || !slug || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (typeof adminPassword !== "string" || adminPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(adminEmail))) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const restaurant = await db.restaurant.create({
    data: {
      name: String(restaurantName).slice(0, 100),
      slug: String(slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60),
      admins: {
        create: {
          email: String(adminEmail).toLowerCase().trim(),
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    restaurantId: restaurant.id,
    message: "Restaurante creado. Ya podés iniciar sesión.",
  }, { status: 201 });
}
