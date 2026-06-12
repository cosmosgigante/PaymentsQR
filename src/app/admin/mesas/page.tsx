import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import { db } from "@/lib/db";
import TablesManager from "@/components/admin/TablesManager";

export default async function AdminMesasPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canAccess(session, "MESAS")) redirect("/trabajo");

  const tables = await db.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { number: "asc" },
  });

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { slug: true },
  });

  return (
    <TablesManager
      initialTables={JSON.parse(JSON.stringify(tables))}
      restaurantSlug={restaurant?.slug ?? ""}
    />
  );
}
