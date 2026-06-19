import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

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
  return admin?.role === "SUPERADMIN" ? admin : null;
}

// Actividad de superadmins: lo que Maxi y Nacho tocan en cuentas de otros
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const logs = await db.activityLog.findMany({
    where: { actorType: "SUPERADMIN" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Enriquecer con nombre de cuenta si hay accountId
  const accountIds = [...new Set(logs.map((l) => l.accountId).filter(Boolean))] as string[];
  const accounts = accountIds.length
    ? await db.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, ownerEmail: true, name: true } })
    : [];
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return NextResponse.json({ logs: logs.map((l) => ({ ...l, account: l.accountId ? (accMap[l.accountId] ?? null) : null })) });
}
