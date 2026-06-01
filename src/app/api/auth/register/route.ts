import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import pg from "pg";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Solo se puede registrar si el email fue pre-aprobado por el SUPERADMIN
  const admin = await db.admin.findUnique({ where: { email }, select: { id: true } });
  if (!admin) {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso" }, { status: 403 });
  }

  const hash = await bcrypt.hash(password, 12);
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const existing = await client.query(
      "SELECT id FROM auth.users WHERE email = $1", [email]
    );

    if (existing.rows.length > 0) {
      // Ya existe — actualizar contraseña y confirmar email
      await client.query(`
        UPDATE auth.users SET
          encrypted_password = $1,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
        WHERE email = $2
      `, [hash, email]);
    } else {
      // Crear nuevo usuario con email ya confirmado
      const userId = randomUUID();
      await client.query(`
        INSERT INTO auth.users (
          id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data, is_super_admin
        ) VALUES (
          $1::uuid, 'authenticated', 'authenticated', $2, $3,
          now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb, false
        )
      `, [userId, email, hash]);

      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1::uuid, $1::uuid,
          jsonb_build_object('sub', $1::text, 'email', $2::text),
          'email', now(), now(), now()
        )
      `, [userId, email]);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  } finally {
    await client.end();
  }
}
