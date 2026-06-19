import { db } from "@/lib/db";
import { resolveServerAdmin, accountAccess } from "@/lib/account";
import { redirect } from "next/navigation";
import CuentaClient from "./CuentaClient";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");

  const account = admin.account;
  const access = accountAccess(admin, account);
  const restaurants = await db.restaurant.findMany({
    where: access.isFull
      ? { accountId: account.id }
      : { accountId: account.id, id: { in: access.allowedRestaurantIds ?? [] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, status: true, isActive: true, createdAt: true, _count: { select: { tables: true, orders: true } } },
  });

  const now = new Date();
  const membershipActive = account.isActive && !!account.subscriptionEndsAt && account.subscriptionEndsAt > now;

  return (
    <CuentaClient
      account={{
        id: account.id,
        ownerEmail: account.ownerEmail,
        name: account.name,
        planType: account.planType,
        priceArs: account.priceArs,
        subscriptionStartedAt: account.subscriptionStartedAt?.toISOString() ?? null,
        subscriptionEndsAt: account.subscriptionEndsAt?.toISOString() ?? null,
        paymentSource: account.paymentSource,
        isActive: account.isActive,
        pendingPlanType: account.pendingPlanType ?? null,
        membershipActive,
      }}
      restaurants={JSON.parse(JSON.stringify(restaurants))}
      isFull={access.isFull}
    />
  );
}
