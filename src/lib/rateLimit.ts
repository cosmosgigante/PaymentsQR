import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Una sola query SQL atómica en vez de transaction + 2-3 roundtrips
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const result = await db.$queryRaw<[{ current_count: number }]>(
      Prisma.sql`
        INSERT INTO "RateLimit" (id, count, "resetAt")
        VALUES (${key}, 1, ${resetAt})
        ON CONFLICT (id) DO UPDATE SET
          count = CASE
            WHEN "RateLimit"."resetAt" < NOW() THEN 1
            ELSE "RateLimit".count + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimit"."resetAt" < NOW() THEN ${resetAt}
            ELSE "RateLimit"."resetAt"
          END
        RETURNING count AS current_count
      `
    );
    return result[0].current_count <= max;
  } catch {
    return true;
  }
}
