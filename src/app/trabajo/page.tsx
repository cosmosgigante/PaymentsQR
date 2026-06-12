import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { STAFF_MODULES, canAccess } from "@/lib/staff";
import TrabajoClient from "./TrabajoClient";

export const dynamic = "force-dynamic";

export default async function TrabajoPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "STAFF") redirect(session.role === "SUPERADMIN" ? "/setup" : "/admin");

  // Revocación: si la sesión fue eliminada (token borrado por el admin), salir
  if (session.staffSessionId) {
    const ses = await db.accessSession.findUnique({ where: { id: session.staffSessionId }, select: { id: true } });
    if (!ses) redirect("/?error=sesion");
  }

  const [restaurant, token] = await Promise.all([
    db.restaurant.findUnique({ where: { id: session.restaurantId }, select: { name: true } }),
    session.staffTokenId
      ? db.accessToken.findUnique({ where: { id: session.staffTokenId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const modules = STAFF_MODULES.filter((m) => canAccess(session, m.key));

  return <TrabajoClient restaurantName={restaurant?.name ?? ""} accessName={token?.name ?? "Personal"} modules={modules} />;
}
