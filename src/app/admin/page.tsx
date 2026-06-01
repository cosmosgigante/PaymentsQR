import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { isActive: true },
  });

  if (!restaurant?.isActive) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-white font-bold text-xl mb-2">Cuenta suspendida</h1>
          <p className="text-zinc-400 text-sm">Tu restaurante fue suspendido temporalmente. Contactá al soporte para más información.</p>
        </div>
      </div>
    );
  }

  const [ordersToday, tablesCount, menuItemsCount] = await Promise.all([
    db.order.count({
      where: {
        restaurantId: session.restaurantId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    db.table.count({ where: { restaurantId: session.restaurantId } }),
    db.menuItem.count({ where: { restaurantId: session.restaurantId } }),
  ]);

  const recentOrders = await db.order.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { table: true, items: { include: { menuItem: true } } },
  });

  return (
    <AdminDashboard
      stats={{ ordersToday, tablesCount, menuItemsCount }}
      recentOrders={JSON.parse(JSON.stringify(recentOrders))}
    />
  );
}
