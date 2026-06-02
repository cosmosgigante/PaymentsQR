import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import WaiterBoard from "@/components/waiter/WaiterBoard";

export default async function MozosPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const orders = await db.order.findMany({
    where: {
      restaurantId: session.restaurantId,
      status: { in: ["READY", "DELIVERED"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      table: true,
      items: { include: { menuItem: true } },
    },
  });

  return <WaiterBoard initialOrders={JSON.parse(JSON.stringify(orders))} />;
}
