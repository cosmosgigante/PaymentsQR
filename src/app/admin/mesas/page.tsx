import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import { db } from "@/lib/db";
import TablesManager from "@/components/admin/TablesManager";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default async function AdminMesasPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canAccess(session, "MESAS")) redirect("/trabajo");

  const tables = await db.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });

  const activeOrders = await db.order.groupBy({
    by: ["tableId"],
    where: {
      restaurantId: session.restaurantId,
      status: { notIn: ["DELIVERED", "PAID", "CANCELLED"] },
    },
    _count: { id: true },
  });

  const ordersByTable: Record<string, number> = {};
  for (const row of activeOrders) {
    ordersByTable[row.tableId] = row._count.id;
  }

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { slug: true },
  });

  return (
    <>
      <ImpersonationBanner />
      <TablesManager
        initialTables={JSON.parse(JSON.stringify(tables))}
        restaurantSlug={restaurant?.slug ?? ""}
        activeOrders={ordersByTable}
      />
    </>
  );
}
