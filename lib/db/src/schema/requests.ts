import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  location: text("location").notNull().default("Kuningan"),
  requestDate: text("request_date").notNull(),
  notes: text("notes"),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requestItemsTable = pgTable("request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requestsTable.id),
  itemNo: integer("item_no").notNull(),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  purpose: text("purpose").notNull(),
});

export const approvalHistoryTable = pgTable("approval_history", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requestsTable.id),
  action: text("action").notNull(),
  actorId: integer("actor_id").notNull().references(() => usersTable.id),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, createdAt: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;

export const insertRequestItemSchema = createInsertSchema(requestItemsTable).omit({ id: true });
export type InsertRequestItem = z.infer<typeof insertRequestItemSchema>;
export type RequestItem = typeof requestItemsTable.$inferSelect;

export const insertApprovalHistorySchema = createInsertSchema(approvalHistoryTable).omit({ id: true, timestamp: true });
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
export type ApprovalHistory = typeof approvalHistoryTable.$inferSelect;
