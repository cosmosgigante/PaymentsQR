import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

// Cierra la sesión del personal: borra la AccessSession (libera el dispositivo) y la cookie.
export async function POST() {
  const session = await getSession();
  if (session?.staffSessionId) {
    await db.accessSession.delete({ where: { id: session.staffSessionId } }).catch(() => {});
    await logActivity({
      accountId: session.accountId, restaurantId: session.restaurantId, actorType: "STAFF",
      actorName: session.actorName, category: "PERSONAL", action: "LOGOUT",
      detail: `${session.actorName ?? "Personal"} cerró sesión`,
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
