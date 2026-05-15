import { Router } from "express";
import { db } from "@workspace/db";
import { requestsTable, requestItemsTable, usersTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const { role, userId } = req.user!;

  const baseWhere = role === "requester" ? eq(requestsTable.requesterId, userId) : undefined;

  const [pendingRes] = await db
    .select({ cnt: count() })
    .from(requestsTable)
    .where(baseWhere ? sql`${baseWhere} AND ${requestsTable.status} = 'pending'` : eq(requestsTable.status, "pending"));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [approvedThisMonthRes] = await db
    .select({ cnt: count() })
    .from(requestsTable)
    .where(
      baseWhere
        ? sql`${baseWhere} AND ${requestsTable.status} = 'approved' AND ${requestsTable.createdAt} >= ${startOfMonth.toISOString()}`
        : sql`${requestsTable.status} = 'approved' AND ${requestsTable.createdAt} >= ${startOfMonth.toISOString()}`
    );

  const [totalRes] = await db.select({ cnt: count() }).from(requestsTable).where(baseWhere);

  const [fulfilledRes] = await db
    .select({ cnt: count() })
    .from(requestsTable)
    .where(
      baseWhere
        ? sql`${baseWhere} AND ${requestsTable.status} = 'fulfilled'`
        : eq(requestsTable.status, "fulfilled")
    );

  res.json({
    pendingCount: Number(pendingRes?.cnt ?? 0),
    approvedThisMonth: Number(approvedThisMonthRes?.cnt ?? 0),
    totalRequests: Number(totalRes?.cnt ?? 0),
    fulfilledCount: Number(fulfilledRes?.cnt ?? 0),
  });
});

router.get("/dashboard/top-items", requireAuth, async (req, res) => {
  const topItems = await db
    .select({
      itemName: requestItemsTable.itemName,
      requestCount: count(requestItemsTable.id),
      totalQty: sql<string>`string_agg(${requestItemsTable.quantity} || ' ' || ${requestItemsTable.unit}, ', ')`,
    })
    .from(requestItemsTable)
    .groupBy(requestItemsTable.itemName)
    .orderBy(desc(count(requestItemsTable.id)))
    .limit(10);

  res.json(topItems.map((item) => ({
    itemName: item.itemName,
    requestCount: Number(item.requestCount),
    totalQty: item.totalQty ?? "",
  })));
});

router.get("/dashboard/recent-requests", requireAuth, async (req, res) => {
  const { role, userId } = req.user!;

  const rows = await db
    .select({
      id: requestsTable.id,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      requesterId: requestsTable.requesterId,
      fullName: usersTable.fullName,
    })
    .from(requestsTable)
    .leftJoin(usersTable, eq(requestsTable.requesterId, usersTable.id))
    .where(role === "requester" ? eq(requestsTable.requesterId, userId) : undefined)
    .orderBy(desc(requestsTable.createdAt))
    .limit(10);

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    res.json([]);
    return;
  }

  const itemCounts = await db
    .select({
      requestId: requestItemsTable.requestId,
      cnt: count(requestItemsTable.id),
    })
    .from(requestItemsTable)
    .where(sql`${requestItemsTable.requestId} = ANY(ARRAY[${sql.raw(ids.join(","))}])`)
    .groupBy(requestItemsTable.requestId);

  const countMap = new Map(itemCounts.map((ic) => [ic.requestId, Number(ic.cnt)]));

  res.json(
    rows.map((r) => ({
      id: r.id,
      requesterName: r.fullName ?? "Unknown",
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      itemCount: countMap.get(r.id) ?? 0,
    }))
  );
});

export default router;
