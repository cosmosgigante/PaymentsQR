import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import { db } from "@/lib/db";
import MenuManager from "@/components/admin/MenuManager";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default async function AdminMenuPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canAccess(session, "MENU")) redirect("/trabajo");

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return <><ImpersonationBanner /><MenuManager initialCategories={JSON.parse(JSON.stringify(categories))} /></>;
}
