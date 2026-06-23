import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/server/db";
import { requests, users } from "@/server/db/schema";

export const DAILY_REQUEST_LIMIT = 10;

function getStartOfToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

export async function checkAndRecordRequest(userId: string) {
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { allowed: false as const };
  }

  if (!user.isAdmin) {
    const [result] = await db
      .select({ value: count() })
      .from(requests)
      .where(
        and(
          eq(requests.userId, userId),
          gte(requests.createdAt, getStartOfToday()),
        ),
      );

    if ((result?.value ?? 0) >= DAILY_REQUEST_LIMIT) {
      return { allowed: false as const };
    }
  }

  await db.insert(requests).values({ userId });

  return { allowed: true as const };
}
