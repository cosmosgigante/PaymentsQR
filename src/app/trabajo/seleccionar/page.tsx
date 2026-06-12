import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyStaffPending, operativeRestaurantsForToken } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function SeleccionarPage() {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get("staff_pending")?.value;
  const pending = pendingCookie ? await verifyStaffPending(pendingCookie) : null;
  if (!pending) redirect("/?error=expired");

  let restaurants: { id: string; name: string }[] = [];
  if (pending.kind === "password" && pending.tokenId) {
    const token = await db.accessToken.findUnique({ where: { id: pending.tokenId } });
    if (token) restaurants = await operativeRestaurantsForToken(token);
  } else if (pending.kind === "google" && pending.email) {
    const gTokens = await db.accessToken.findMany({ where: { email: pending.email, authType: "GOOGLE" } });
    const map = new Map<string, string>();
    for (const t of gTokens) for (const r of await operativeRestaurantsForToken(t)) map.set(r.id, r.name);
    restaurants = [...map].map(([id, name]) => ({ id, name }));
  }
  if (restaurants.length === 0) redirect("/?error=sin-restoran");

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏪</div>
          <h1 className="font-bold text-gray-900 text-xl">¿En qué restorán estás trabajando?</h1>
          <p className="text-gray-400 text-sm mt-1">Elegí dónde vas a trabajar ahora.</p>
        </div>
        <div className="space-y-2">
          {restaurants.map((r) => (
            <a key={r.id} href={`/api/staff/enter?restaurantId=${r.id}`}
              className="flex items-center justify-between bg-white border border-gray-100 hover:border-blue-300 rounded-2xl px-5 py-4 shadow-sm transition-all">
              <span className="font-semibold text-gray-900">{r.name}</span>
              <span className="text-blue-700 text-sm font-semibold">Entrar →</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
