import { db } from "@/lib/db";

export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({ where: { id: key } });

      if (!existing || existing.resetAt < now) {
        await tx.rateLimit.upsert({
          where: { id: key },
          create: { id: key, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
        return true;
      }

      if (existing.count >= max) return false;

      await tx.rateLimit.update({
        where: { id: key },
        data: { count: { increment: 1 } },
      });
      return true;
    });

    return result;
  } catch {
    // Si la DB falla, dejar pasar para no bloquear usuarios legítimos
    return true;
  }
}
