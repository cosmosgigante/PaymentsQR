import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Falla fuerte si no está configurado — nunca usar fallback en producción
function getSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). Revisá el .env"
    );
  }
  return new TextEncoder().encode(raw);
}

export type AdminPayload = {
  adminId: string;
  restaurantId: string;
  role: string; // "SUPERADMIN" | "OWNER" | "STAFF"
  accountId?: string;
  actorName?: string;
  staffTokenId?: string;
  staffSessionId?: string;
  permissions?: Record<string, string>;
  impersonating?: boolean; // true cuando un superadmin ingresó a cuenta ajena
};

export async function signToken(payload: AdminPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
