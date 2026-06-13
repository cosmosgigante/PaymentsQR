import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { resolveServerAdmin, accountAccess } from "@/lib/account";
import ConfigClient from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");
  const a = admin.account;

  // Los socios restringidos no acceden a la configuración de cuenta
  if (!accountAccess(admin, a).isFull) redirect("/cuenta");

  const restaurants = await db.restaurant.findMany({
    where: { accountId: a.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ConfigClient
      restaurants={restaurants}
      account={{
        name: a.name,
        ownerEmail: a.ownerEmail,
        planType: a.planType,
        priceArs: a.priceArs,
        subscriptionStartedAt: a.subscriptionStartedAt?.toISOString() ?? null,
        subscriptionEndsAt: a.subscriptionEndsAt?.toISOString() ?? null,
        paymentSource: a.paymentSource,
        canceledAt: a.canceledAt?.toISOString() ?? null,
        isActive: a.isActive,
      }}
    />
  );
}
