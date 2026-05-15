import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  defaultUnit: text("default_unit").notNull(),
  category: text("category").notNull().default("Umum"),
  currentStock: integer("current_stock").default(0),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
