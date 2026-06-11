import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isRestaurantOperative, isAccountActive } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [restaurant, ordersToday, tablesCount, menuItemsCount, recentOrders, adminSelf] = await Promise.all([
    db.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { isActive: true, status: true, subscriptionEndsAt: true, account: { select: { isActive: true, subscriptionEndsAt: true } } },
    }),
    db.order.count({
      where: { restaurantId: session.restaurantId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    db.table.count({ where: { restaurantId: session.restaurantId } }),
    db.menuItem.count({ where: { restaurantId: session.restaurantId } }),
    db.order.findMany({
      where: { restaurantId: session.restaurantId, status: { notIn: ["PAID", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { table: true, items: { include: { menuItem: true } } },
    }),
    db.admin.findUnique({ where: { id: session.adminId }, select: { accountId: true } }),
  ]);

  if (!restaurant || !isRestaurantOperative(restaurant, restaurant.account)) {
    const account = restaurant?.account ?? null;
    const expired = !!restaurant?.isActive && !isAccountActive(account) && (account?.subscriptionEndsAt != null);
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-white font-bold text-xl mb-2">
            {expired ? "Suscripción vencida" : "Cuenta suspendida"}
          </h1>
          <p className="text-zinc-400 text-sm">
            {expired
              ? "La suscripción de tu cuenta venció. Renovala para reactivar tus restoranes o contactá al soporte."
              : "Tu restaurante fue suspendido temporalmente. Contactá al soporte para más información."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard
      stats={{ ordersToday, tablesCount, menuItemsCount }}
      recentOrders={JSON.parse(JSON.stringify(recentOrders))}
      generalAdmin={!!adminSelf?.accountId}
    />
  );
}
