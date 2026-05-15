import { Router } from "express";
import { db } from "@workspace/db";
import {
  requestsTable,
  requestItemsTable,
  usersTable,
  itemsTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  CreateRequestBody,
  UpdateRequestBody,
  UpdateRequestParams,
  GetRequestParams,
  ListRequestsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// List requests
router.get("/requests", requireAuth, async (req, res) => {
  const queryParsed = ListRequestsQueryParams.safeParse(req.query);
  const { requesterId } = queryParsed.success ? queryParsed.data : {};

  const { role, userId } = req.user!;

  const conditions = [];
  if (role === "requester") {
    conditions.push(eq(requestsTable.requesterId, userId));
  } else if (requesterId) {
    conditions.push(eq(requestsTable.requesterId, requesterId));
  }

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => and(a, b)!)
    : undefined;

  const rows = await db
    .select({
      id: requestsTable.id,
      requesterId: requestsTable.requesterId,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      location: requestsTable.location,
      requestDate: requestsTable.requestDate,
      approvedBy: requestsTable.approvedBy,
      approvedAt: requestsTable.approvedAt,
      notes: requestsTable.notes,
      fullName: usersTable.fullName,
    })
    .from(requestsTable)
    .leftJoin(usersTable, eq(requestsTable.requesterId, usersTable.id))
    .where(where)
    .orderBy(desc(requestsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.fullName ?? "Unknown",
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      location: r.location,
      requestDate: r.requestDate,
      approvedBy: r.approvedBy ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      notes: r.notes ?? null,
    }))
  );
});

// Create request
router.post("/requests", requireAuth, async (req, res) => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { location, requestDate, items } = parsed.data;

  const [newRequest] = await db
    .insert(requestsTable)
    .values({
      requesterId: req.user!.userId,
      status: "submitted",
      location,
      requestDate,
    })
    .returning();

  if (items && items.length > 0) {
    await db.insert(requestItemsTable).values(
      items.map((item) => ({
        requestId: newRequest.id,
        itemNo: item.itemNo,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        purpose: item.purpose,
      }))
    );

    // Deduct stock for each item that exists in the master.
    for (const item of items) {
      const qty = Number.parseInt(item.quantity, 10);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      await db
        .update(itemsTable)
        .set({ currentStock: sql`COALESCE(${itemsTable.currentStock}, 0) - ${qty}` })
        .where(eq(itemsTable.name, item.itemName));
    }
  }

  const [requester] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));

  res.status(201).json({
    id: newRequest.id,
    requesterId: newRequest.requesterId,
    requesterName: requester?.fullName ?? "Unknown",
    status: newRequest.status,
    createdAt: newRequest.createdAt.toISOString(),
    location: newRequest.location,
    requestDate: newRequest.requestDate,
    approvedBy: null,
    approvedAt: null,
    notes: null,
  });
});

// Get request detail
router.get("/requests/:id", requireAuth, async (req, res) => {
  const paramsParsed = GetRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { id } = paramsParsed.data;

  const [row] = await db
    .select({
      id: requestsTable.id,
      requesterId: requestsTable.requesterId,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      location: requestsTable.location,
      requestDate: requestsTable.requestDate,
      approvedBy: requestsTable.approvedBy,
      approvedAt: requestsTable.approvedAt,
      notes: requestsTable.notes,
      requesterName: usersTable.fullName,
      requesterSection: usersTable.section,
    })
    .from(requestsTable)
    .leftJoin(usersTable, eq(requestsTable.requesterId, usersTable.id))
    .where(eq(requestsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  const items = await db
    .select()
    .from(requestItemsTable)
    .where(eq(requestItemsTable.requestId, id))
    .orderBy(requestItemsTable.itemNo);

  res.json({
    id: row.id,
    requesterId: row.requesterId,
    requesterName: row.requesterName ?? "Unknown",
    requesterSection: row.requesterSection ?? "",
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    location: row.location,
    requestDate: row.requestDate,
    approvedBy: row.approvedBy ?? null,
    approvedByName: null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    notes: row.notes ?? null,
    items: items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      purpose: item.purpose,
      itemNo: item.itemNo,
    })),
    approvalHistory: [],
  });
});

// Update request
router.patch("/requests/:id", requireAuth, async (req, res) => {
  const paramsParsed = UpdateRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = UpdateRequestBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { id } = paramsParsed.data;
  const { location, requestDate, items } = bodyParsed.data;

  const updateData: Record<string, unknown> = {};
  if (location) updateData.location = location;
  if (requestDate) updateData.requestDate = requestDate;

  if (Object.keys(updateData).length > 0) {
    await db.update(requestsTable).set(updateData).where(eq(requestsTable.id, id));
  }

  if (items && items.length > 0) {
    await db.delete(requestItemsTable).where(eq(requestItemsTable.requestId, id));
    await db.insert(requestItemsTable).values(
      items.map((item) => ({
        requestId: id,
        itemNo: item.itemNo,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        purpose: item.purpose,
      }))
    );
  }

  const [updated] = await db
    .select({
      id: requestsTable.id,
      requesterId: requestsTable.requesterId,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      location: requestsTable.location,
      requestDate: requestsTable.requestDate,
      approvedBy: requestsTable.approvedBy,
      approvedAt: requestsTable.approvedAt,
      notes: requestsTable.notes,
      fullName: usersTable.fullName,
    })
    .from(requestsTable)
    .leftJoin(usersTable, eq(requestsTable.requesterId, usersTable.id))
    .where(eq(requestsTable.id, id));

  res.json({
    id: updated.id,
    requesterId: updated.requesterId,
    requesterName: updated.fullName ?? "Unknown",
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    location: updated.location,
    requestDate: updated.requestDate,
    approvedBy: updated.approvedBy ?? null,
    approvedAt: updated.approvedAt?.toISOString() ?? null,
    notes: updated.notes ?? null,
  });
});

export default router;
