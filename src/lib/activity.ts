import { db } from "@/lib/db";

export type ActivityCategory = "PERSONAL" | "PEDIDOS" | "MENU" | "MESAS" | "CUENTA";

type LogInput = {
  accountId?: string | null;
  restaurantId?: string | null;
  actorType: string;       // "OWNER" | "STAFF" | "SUPERADMIN" | "SYSTEM" | "CUSTOMER"
  actorName?: string | null;
  category: ActivityCategory;
  action: string;
  detail?: string | null;
};

/**
 * Registra un evento de actividad. NUNCA lanza: si falla, no rompe la acción
 * principal (solo loguea el error). Llamar después de que la acción tuvo éxito.
 */
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        accountId: input.accountId ?? null,
        restaurantId: input.restaurantId ?? null,
        actorType: input.actorType,
        actorName: input.actorName ?? null,
        category: input.category,
        action: input.action,
        detail: input.detail ?? null,
      },
    });
  } catch (e) {
    console.error("[activity] no se pudo registrar:", e);
  }
}
