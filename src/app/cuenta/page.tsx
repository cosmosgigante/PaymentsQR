import { db } from "@/lib/db";
import { resolveServerAdmin } from "@/lib/account";
import { redirect } from "next/navigation";
import CuentaClient from "./CuentaClient";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");

  const account = admin.account;
  const restaurants = await db.restaurant.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
      createdAt: true,
      _count: { select: { tables: true, orders: true } },
    },
  });

  return (
    <CuentaClient
      account={{
        ownerEmail: account.ownerEmail,
        name: account.name,
        planType: account.planType,
        priceArs: account.priceArs,
        subscriptionStartedAt: account.subscriptionStartedAt?.toISOString() ?? null,
        subscriptionEndsAt: account.subscriptionEndsAt?.toISOString() ?? null,
        paymentSource: account.paymentSource,
        isActive: account.isActive,
      }}
      restaurants={JSON.parse(JSON.stringify(restaurants))}
    />
  );
}
