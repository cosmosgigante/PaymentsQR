import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Sesión de mesa: agrupa los pedidos de un grupo de comensales en tiempo real,
// persistida en la base. Reemplaza la "memoria del navegador" por estado real.
// - Límite de dispositivos por mesa (anti-escaneo de la mesa ajena).
// - Una sesión "vence" tras inactividad → la próxima tanda empieza una sesión nueva
//   sin necesidad de que alguien la cierre a mano (el cierre formal llega en slice 2).

export const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 h de inactividad → vencida
const DEVICE_COOKIE = "pqr_device";
const DEVICE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type SessionRow = {
  id: string;
  status: string;
  deviceIds: string;
  maxDevices: number;
  paymentStatus: string | null;
};

/** Lee el id de dispositivo del cookie httpOnly, o genera uno nuevo. */
export function readDeviceId(req: NextRequest): { deviceId: string; isNew: boolean } {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{10,64}$/i.test(existing)) return { deviceId: existing, isNew: false };
  return { deviceId: randomUUID(), isNew: true };
}

/** Fija el cookie de dispositivo en la respuesta (httpOnly: el cliente no lo manipula). */
export function setDeviceCookie(res: NextResponse, deviceId: string) {
  res.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_MAX_AGE,
    path: "/",
  });
}

function parseDevices(raw: string): string[] {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

/**
 * Une el dispositivo a la sesión VIGENTE de la mesa (o crea una nueva).
 * Devuelve `full: true` (sin unir) si la mesa ya alcanzó su máximo de dispositivos.
 *
 * Invariante "1 sesión activa por mesa": toda la resolución corre dentro de una
 * transacción con un advisory lock por mesa, así dos escaneos simultáneos NO
 * crean sesiones duplicadas (se serializan; el segundo ve la que creó el primero).
 *
 * Persistencia por identidad: si `identityEmail` (Google verificado) ya participó
 * en la sesión, se lo RE-ENGANCHA aunque el cupo de dispositivos esté lleno — es la
 * misma persona volviendo (perdió la cookie, cerró el navegador), no un extraño.
 * Ya NO se cierra la sesión al detectar "otro email": varios comensales logueados
 * conviven en la misma sesión (multi-comensal); cerrar la mesa es manual (mozos/caja).
 */
export async function joinOrCreateSession(opts: {
  tableId: string;
  restaurantId: string;
  maxDevices: number;
  deviceId: string;
  identityEmail?: string;
  startStatus?: string; // "OPEN" | "PENDING_CONFIRM" (si el restorán exige confirmar la mesa)
}): Promise<{ session: SessionRow; full: boolean }> {
  const status = opts.startStatus === "PENDING_CONFIRM" ? "PENDING_CONFIRM" : "OPEN";

  // Camino con lock (invariante). Si por lo que sea falla (p.ej. incompatibilidad
  // del pooler), NO rompemos el pedido: caemos a la resolución sin lock. La
  // transacción es atómica → si aborta, no deja estado a medias antes del fallback.
  try {
    return await db.$transaction(async (tx) => {
      // Serializa por mesa: hashtext(tableId) → clave del lock (se libera al terminar la tx).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${opts.tableId})::int8)`;
      return resolveJoin(tx, opts, status);
    });
  } catch (e) {
    console.error("[joinOrCreateSession] fallback sin advisory lock:", e);
    return resolveJoin(db, opts, status);
  }
}

// Resolución "unir o crear" (sin el lock). La comparten el camino con lock (tx) y
// el fallback (db). El invariante y la persistencia se explican en joinOrCreateSession.
async function resolveJoin(
  client: Prisma.TransactionClient,
  opts: { tableId: string; restaurantId: string; maxDevices: number; deviceId: string; identityEmail?: string },
  status: string,
): Promise<{ session: SessionRow; full: boolean }> {
  const { tableId, restaurantId, maxDevices, deviceId, identityEmail } = opts;
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);

  const existing = await client.tableSession.findFirst({
    where: { tableId, status: { not: "CLOSED" }, lastActivityAt: { gte: cutoff } },
    orderBy: { openedAt: "desc" },
  });

  if (existing) {
    const devices = parseDevices(existing.deviceIds);

    // Este dispositivo ya está en la sesión → solo refrescamos actividad.
    if (devices.includes(deviceId)) {
      const updated = await client.tableSession.update({
        where: { id: existing.id },
        data: { lastActivityAt: new Date() },
      });
      return { session: updated, full: false };
    }

    // Reingreso por identidad: si este email verificado ya pidió en la sesión,
    // vuelve a entrar aunque el cupo esté lleno (no gasta un lugar nuevo).
    let isReturning = false;
    if (identityEmail) {
      const prev = await client.order.findFirst({
        where: { tableSessionId: existing.id, customerEmail: identityEmail },
        select: { id: true },
      });
      isReturning = !!prev;
    }

    if (!isReturning && devices.length >= existing.maxDevices) {
      return { session: existing, full: true };
    }

    const updated = await client.tableSession.update({
      where: { id: existing.id },
      data: { deviceIds: JSON.stringify([...devices, deviceId]), lastActivityAt: new Date() },
    });
    return { session: updated, full: false };
  }

  const created = await client.tableSession.create({
    data: { tableId, restaurantId, maxDevices, deviceIds: JSON.stringify([deviceId]), status },
  });
  return { session: created, full: false };
}

// ── Estado en vivo de las mesas ──────────────────────────────────────────────
// Para la vista de Mesas en tiempo real: cada mesa OCUPADA (con sesión activa)
// con sus rondas, totales y desde cuándo. Fuente única (la usan la página y el
// endpoint del poll). Devuelve un mapa tableId → estado de su sesión activa.

export type LiveTableOrder = { id: string; status: string; total: number; items: { quantity: number; name: string }[] };
export type LiveTableState = { sessionId: string; status: string; openedAt: string; orderCount: number; total: number; orders: LiveTableOrder[] };
export type LiveTablesMap = Record<string, LiveTableState>;

export async function liveTableStates(restaurantId: string): Promise<LiveTablesMap> {
  const sessions = await db.tableSession.findMany({
    where: { restaurantId, status: { in: ["OPEN", "PENDING_CONFIRM"] } },
    orderBy: { openedAt: "asc" }, // si hubiera 2 en la misma mesa, gana la más reciente
    include: {
      table: { select: { id: true } },
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: { include: { menuItem: { select: { name: true } } } } },
      },
    },
  });

  const map: LiveTablesMap = {};
  for (const s of sessions) {
    const live = s.orders.filter((o) => o.status !== "CANCELLED");
    map[s.table.id] = {
      sessionId: s.id,
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      orderCount: live.length,
      total: live.reduce((sum, o) => sum + o.total, 0),
      orders: live.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        items: o.items.map((it) => ({ quantity: it.quantity, name: it.menuItem.name })),
      })),
    };
  }
  return map;
}
