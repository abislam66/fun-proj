import { and, count, eq, gte } from "drizzle-orm";

import { PROBLEM_REPORT_RATE_LIMIT } from "@/config/site";
import { db } from "@/lib/db";
import { problemReports } from "@/lib/db/schema";

export { hashIp } from "@/lib/ip-hash";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function isOverLimit(
  total: number,
  max: number = PROBLEM_REPORT_RATE_LIMIT.max,
): boolean {
  return total >= max;
}

/**
 * Postgres-backed rate limit for anonymous problem reports.
 * Counts recent rows for this salted IP hash — no Redis.
 */
export async function assertProblemReportAllowed(
  ipHash: string,
): Promise<void> {
  const since = new Date(Date.now() - PROBLEM_REPORT_RATE_LIMIT.windowMs);
  const [row] = await db
    .select({ total: count() })
    .from(problemReports)
    .where(
      and(
        eq(problemReports.ipHash, ipHash),
        gte(problemReports.createdAt, since),
      ),
    );

  if (isOverLimit(row?.total ?? 0)) {
    throw new RateLimitError(
      "Too many problem reports from this network. Try again later.",
    );
  }
}
