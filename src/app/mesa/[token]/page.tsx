import { db } from "@/lib/db";
import MobileFrame from "@/components/customer/MobileFrame";
import MesaClient from "./MesaClient";

export default async function MesaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const table = await db.table.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      number: true,
      label: true,
      isActive: true,
      restaurantId: true,
      restaurant: {
        select: { name: true, primaryColor: true },
      },
    },
  });

  if (!table || !table.isActive) {
    return (
      <MobileFrame>
        <div className="min-h-[100dvh] flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Mesa no encontrada</h2>
            <p className="text-zinc-400 text-sm">El QR no es válido o la mesa está inactiva.</p>
          </div>
        </div>
      </MobileFrame>
    );
  }

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: table.restaurantId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      items: {
        where: { available: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          available: true,
          sortOrder: true,
        },
      },
    },
  });

  return (
    <MobileFrame>
      <MesaClient
        token={token}
        table={{ id: table.id, number: table.number, label: table.label }}
        restaurant={table.restaurant}
        categories={categories}
      />
    </MobileFrame>
  );
}
