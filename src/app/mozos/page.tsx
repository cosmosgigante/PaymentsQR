import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import { db } from "@/lib/db";
import WaiterBoard from "@/components/waiter/WaiterBoard";
import { WAITER_ACTIVE } from "@/lib/orderFlow";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default async function MozosPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!canAccess(session, "MOZOS")) redirect("/trabajo");

  const orders = await db.order.findMany({
    where: {
      restaurantId: session.restaurantId,
      status: { in: WAITER_ACTIVE },
    },
    orderBy: { createdAt: "asc" },
    include: {
      table: true,
      items: { include: { menuItem: true } },
    },
  });

  return <><ImpersonationBanner /><WaiterBoard initialOrders={JSON.parse(JSON.stringify(orders))} /></>;
}
