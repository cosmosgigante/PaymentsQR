import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyStaffPending, createStaffSession, operativeRestaurantsForToken, isTokenUsable } from "@/lib/staff";

// El personal elige en qué restorán trabaja (cuando tiene varios). Crea la sesión.
export async function GET(req: NextRequest) {
  const pendingCookie = req.cookies.get("staff_pending")?.value;
  const pending = pendingCookie ? await verifyStaffPending(pendingCookie) : null;
  if (!pending) return NextResponse.redirect(new URL("/?error=expired", req.url));

  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.redirect(new URL("/trabajo/seleccionar", req.url));

  // Resolver el AccessToken que cubre ese restorán
  let token: Awaited<ReturnType<typeof db.accessToken.findUnique>> = null;
  if (pending.kind === "password" && pending.tokenId) {
    token = await db.accessToken.findUnique({ where: { id: pending.tokenId } });
  } else if (pending.kind === "google" && pending.email) {
    const gTokens = await db.accessToken.findMany({ where: { email: pending.email, authType: "GOOGLE" } });
    for (const t of gTokens) {
      const restos = await operativeRestaurantsForToken(t);
      if (restos.some((r) => r.id === restaurantId)) { token = t; break; }
    }
  }

  if (!token || !isTokenUsable(token)) return NextResponse.redirect(new URL("/?error=expired", req.url));

  const restos = await operativeRestaurantsForToken(token);
  if (!restos.some((r) => r.id === restaurantId)) {
    return NextResponse.redirect(new URL("/trabajo/seleccionar?error=invalido", req.url));
  }

  const jwt = await createStaffSession(token, restaurantId);
  const res = NextResponse.redirect(new URL("/trabajo", req.url));
  res.cookies.set("admin_token", jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 8, path: "/",
  });
  res.cookies.delete("staff_pending");
  return res;
}
