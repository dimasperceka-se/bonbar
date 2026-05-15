import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db";
import { eq, like, sql } from "drizzle-orm";
import { CreateItemBody, UpdateItemBody, ListItemsQueryParams, UpdateItemParams, DeleteItemParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/items", requireAuth, async (req, res) => {
  const queryParsed = ListItemsQueryParams.safeParse(req.query);
  const { category, q } = queryParsed.success ? queryParsed.data : {};

  let query = db.select().from(itemsTable);

  const conditions = [];
  if (category) conditions.push(eq(itemsTable.category, category));
  if (q) conditions.push(like(itemsTable.name, `%${q}%`));

  if (conditions.length > 0) {
    const items = await db.select().from(itemsTable).where(sql`${conditions.map((c) => c).reduce((a, b) => sql`${a} AND ${b}`)}`);
    res.json(items);
    return;
  }

  const items = await query;
  res.json(items);
});

router.post("/items", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [item] = await db.insert(itemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.patch("/items/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const paramsParsed = UpdateItemParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateItemBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [item] = await db
    .update(itemsTable)
    .set(bodyParsed.data)
    .where(eq(itemsTable.id, paramsParsed.data.id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Item tidak ditemukan" });
    return;
  }
  res.json(item);
});

router.delete("/items/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const paramsParsed = DeleteItemParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(itemsTable).where(eq(itemsTable.id, paramsParsed.data.id));
  res.status(204).send();
});

export default router;
