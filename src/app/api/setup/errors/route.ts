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

// Errores del sistema (últimos 7 días), agrupados por mensaje para el panel.
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const logs = await db.errorLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Agrupar por mensaje+source: cuántas veces y cuándo se vio por última vez.
    const map = new Map<string, { message: string; source: string; path: string | null; count: number; lastSeen: string; digest: string | null }>();
    for (const l of logs) {
      const key = `${l.source}|${l.message}`;
      const prev = map.get(key);
      if (prev) { prev.count++; }
      else map.set(key, { message: l.message, source: l.source, path: l.path, count: 1, lastSeen: l.createdAt.toISOString(), digest: l.digest });
    }
    const grupos = Array.from(map.values()).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    return NextResponse.json({ total: logs.length, grupos });
  } catch {
    // Si la tabla todavía no existe (falta correr el SQL), no romper el panel.
    return NextResponse.json({ total: 0, grupos: [], pendienteTabla: true });
  }
}
