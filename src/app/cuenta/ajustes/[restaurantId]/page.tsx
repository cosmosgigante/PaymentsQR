import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { resolveServerAdmin, accountAccess } from "@/lib/account";
import AjustesClient from "./AjustesClient";

export const dynamic = "force-dynamic";

export default async function AjustesPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;

  const admin = await resolveServerAdmin();
  if (!admin?.accountId || !admin.account) redirect("/?error=unauthorized");

  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, accountId: admin.account.id },
    select: { id: true, name: true, confirmTableEnabled: true, maxTableDevices: true, flowConfirmEnabled: true, flowDeliveredEnabled: true },
  });
  if (!restaurant) redirect("/cuenta");

  const access = accountAccess(admin, admin.account);
  if (!access.isFull && !(access.allowedRestaurantIds ?? []).includes(restaurantId)) redirect("/cuenta");

  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId, provider: "MERCADOPAGO" } },
  });

  return (
    <AjustesClient
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      operations={{
        confirmTableEnabled: restaurant.confirmTableEnabled,
        maxTableDevices: restaurant.maxTableDevices,
        flowConfirmEnabled: restaurant.flowConfirmEnabled,
        flowDeliveredEnabled: restaurant.flowDeliveredEnabled,
      }}
      mercadopago={{
        enabled: pm?.enabled ?? false,
        hasToken: !!pm?.encryptedToken,
        tokenHint: pm?.tokenHint ?? null,
        publicKey: pm?.publicKey ?? null,
        accountName: pm?.accountName ?? null,
      }}
    />
  );
}
