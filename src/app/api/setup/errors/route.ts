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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  type Grupo = { message: string; source: string; path: string | null; count: number; lastSeen: string; digest: string | null; resueltoEl: string | null; resueltoPor: string | null };

  // Agrupa filas por mensaje+source en un mapa de grupos.
  function agrupar(logs: Awaited<ReturnType<typeof db.errorLog.findMany>>): Grupo[] {
    const map = new Map<string, Grupo>();
    for (const l of logs) {
      const key = `${l.source}|${l.message}`;
      const prev = map.get(key);
      if (prev) { prev.count++; }
      else map.set(key, {
        message: l.message, source: l.source, path: l.path, count: 1,
        lastSeen: l.createdAt.toISOString(), digest: l.digest,
        resueltoEl: l.resolvedAt ? l.resolvedAt.toISOString() : null,
        resueltoPor: l.resolvedBy,
      });
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }

  try {
    const [activos, resueltos] = await Promise.all([
      db.errorLog.findMany({ where: { createdAt: { gte: since }, resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 500 }),
      db.errorLog.findMany({ where: { createdAt: { gte: since }, resolvedAt: { not: null } }, orderBy: { resolvedAt: "desc" }, take: 500 }),
    ]);

    return NextResponse.json({
      activos: agrupar(activos),
      resueltos: agrupar(resueltos),
      totalActivos: activos.length,
    });
  } catch {
    // Si la tabla todavía no existe (falta correr el SQL), no romper el panel.
    return NextResponse.json({ activos: [], resueltos: [], totalActivos: 0, pendienteTabla: true });
  }
}

// Marca un grupo de errores (mismo mensaje+source) como resuelto, o lo reabre.
export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let body: { message?: string; source?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const { message, source } = body;
  const action = body.action === "reopen" ? "reopen" : "resolve";
  if (!message || !source) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const r = await db.errorLog.updateMany({
    where: { message, source, ...(action === "resolve" ? { resolvedAt: null } : { resolvedAt: { not: null } }) },
    data: action === "resolve"
      ? { resolvedAt: new Date(), resolvedBy: sa.email }
      : { resolvedAt: null, resolvedBy: null },
  });

  return NextResponse.json({ ok: true, afectados: r.count });
}
