import { redirect } from "next/navigation";
import { resolveServerAdmin } from "@/lib/account";
import ConfigClient from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");
  const a = admin.account;

  return (
    <ConfigClient
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
