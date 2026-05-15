import { Router } from "express";
import { db } from "@workspace/db";
import {
  requestsTable,
  requestItemsTable,
  approvalHistoryTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  CreateRequestBody,
  UpdateRequestBody,
  UpdateRequestParams,
  GetRequestParams,
  ApproveRequestParams,
  ApproveRequestBody,
  RejectRequestParams,
  RejectRequestBody,
  FulfillRequestParams,
  ListRequestsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

// List requests
router.get("/requests", requireAuth, async (req, res) => {
  const queryParsed = ListRequestsQueryParams.safeParse(req.query);
  const { status, requesterId } = queryParsed.success ? queryParsed.data : {};

  const { role, userId } = req.user!;

  const conditions = [];
  if (role === "requester") {
    conditions.push(eq(requestsTable.requesterId, userId));
  } else if (requesterId) {
    conditions.push(eq(requestsTable.requesterId, requesterId));
  }
  if (status) {
    conditions.push(eq(requestsTable.status, status));
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
      status: "pending",
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
  }

  await db.insert(approvalHistoryTable).values({
    requestId: newRequest.id,
    action: "submitted",
    actorId: req.user!.userId,
    notes: "Permintaan diajukan",
  });

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

  const historyRows = await db
    .select({
      id: approvalHistoryTable.id,
      action: approvalHistoryTable.action,
      notes: approvalHistoryTable.notes,
      timestamp: approvalHistoryTable.timestamp,
      actorName: usersTable.fullName,
    })
    .from(approvalHistoryTable)
    .leftJoin(usersTable, eq(approvalHistoryTable.actorId, usersTable.id))
    .where(eq(approvalHistoryTable.requestId, id))
    .orderBy(approvalHistoryTable.timestamp);

  let approvedByName: string | null = null;
  if (row.approvedBy) {
    const [approver] = await db
      .select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, row.approvedBy));
    approvedByName = approver?.fullName ?? null;
  }

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
    approvedByName,
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
    approvalHistory: historyRows.map((h) => ({
      id: h.id,
      action: h.action,
      actorName: h.actorName ?? "System",
      notes: h.notes ?? null,
      timestamp: h.timestamp.toISOString(),
    })),
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

// Approve request
router.post("/requests/:id/approve", requireAuth, requireRole("kalapas", "admin"), async (req, res) => {
  const paramsParsed = ApproveRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = ApproveRequestBody.safeParse(req.body);
  const notes = bodyParsed.success ? bodyParsed.data.notes : undefined;

  const { id } = paramsParsed.data;

  const [updated] = await db
    .update(requestsTable)
    .set({
      status: "approved",
      approvedBy: req.user!.userId,
      approvedAt: new Date(),
    })
    .where(eq(requestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  await db.insert(approvalHistoryTable).values({
    requestId: id,
    action: "approved",
    actorId: req.user!.userId,
    notes: notes ?? "Disetujui",
  });

  res.json({
    id: updated.id,
    requesterId: updated.requesterId,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    location: updated.location,
    requestDate: updated.requestDate,
    approvedBy: updated.approvedBy ?? null,
    approvedAt: updated.approvedAt?.toISOString() ?? null,
    notes: updated.notes ?? null,
  });
});

// Reject request
router.post("/requests/:id/reject", requireAuth, requireRole("kalapas", "admin"), async (req, res) => {
  const paramsParsed = RejectRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = RejectRequestBody.safeParse(req.body);
  const notes = bodyParsed.success ? bodyParsed.data.notes : undefined;

  const { id } = paramsParsed.data;

  const [updated] = await db
    .update(requestsTable)
    .set({ status: "rejected" })
    .where(eq(requestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  await db.insert(approvalHistoryTable).values({
    requestId: id,
    action: "rejected",
    actorId: req.user!.userId,
    notes: notes ?? "Ditolak",
  });

  res.json({
    id: updated.id,
    requesterId: updated.requesterId,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    location: updated.location,
    requestDate: updated.requestDate,
    approvedBy: null,
    approvedAt: null,
    notes: updated.notes ?? null,
  });
});

// Fulfill request
router.post("/requests/:id/fulfill", requireAuth, requireRole("admin"), async (req, res) => {
  const paramsParsed = FulfillRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { id } = paramsParsed.data;

  const [updated] = await db
    .update(requestsTable)
    .set({ status: "fulfilled" })
    .where(eq(requestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  await db.insert(approvalHistoryTable).values({
    requestId: id,
    action: "fulfilled",
    actorId: req.user!.userId,
    notes: "Barang telah diserahkan",
  });

  res.json({
    id: updated.id,
    requesterId: updated.requesterId,
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
