import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import { db } from "@/lib/db";
import { liveTableStates } from "@/lib/tableSession";
import TablesManager from "@/components/admin/TablesManager";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const dynamic = "force-dynamic";

export default async function AdminMesasPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canAccess(session, "MESAS")) redirect("/trabajo");

  const [tables, restaurant, initialLive] = await Promise.all([
    db.table.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { number: "asc" },
    }),
    db.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { slug: true },
    }),
    liveTableStates(session.restaurantId),
  ]);

  return (
    <>
      <ImpersonationBanner />
      <TablesManager
        initialTables={JSON.parse(JSON.stringify(tables))}
        restaurantSlug={restaurant?.slug ?? ""}
        initialLive={initialLive}
      />
    </>
  );
}
