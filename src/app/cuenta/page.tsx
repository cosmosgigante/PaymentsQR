import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import CuentaClient from "./CuentaClient";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await db.admin.findUnique({
    where: { email: user!.email!.toLowerCase() },
    include: {
      account: {
        include: {
          restaurants: {
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
          },
        },
      },
    },
  });

  const account = admin!.account!;

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
      restaurants={JSON.parse(JSON.stringify(account.restaurants))}
    />
  );
}
