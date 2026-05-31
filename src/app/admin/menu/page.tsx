import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MenuManager from "@/components/admin/MenuManager";

export default async function AdminMenuPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return <MenuManager initialCategories={JSON.parse(JSON.stringify(categories))} />;
}
