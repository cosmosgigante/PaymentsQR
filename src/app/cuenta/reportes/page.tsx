import { db } from "@/lib/db";
import { resolveServerAdmin, accountAccess } from "@/lib/account";
import { redirect } from "next/navigation";
import OwnerReports from "./OwnerReports";

export const dynamic = "force-dynamic";

export default async function CuentaReportesPage() {
  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");

  const account = admin.account;
  const access = accountAccess(admin, account);
  const restaurants = await db.restaurant.findMany({
    where: access.isFull
      ? { accountId: account.id, status: "ACTIVE" }
      : { accountId: account.id, status: "ACTIVE", id: { in: access.allowedRestaurantIds ?? [] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return <OwnerReports restaurants={JSON.parse(JSON.stringify(restaurants))} />;
}
