import { pgTable, serial, varchar, boolean, text, timestamp, index } from "drizzle-orm/pg-core";

export const searchEventsTable = pgTable("search_events", {
  id: serial("id").primaryKey(),
  dish: varchar("dish", { length: 500 }).notNull(),
  vegetarian: boolean("vegetarian").default(false),
  allergies: text("allergies"),
  outcome: varchar("outcome", { length: 50 }).notNull(),
  cuisine: varchar("cuisine", { length: 200 }),
  difficulty: varchar("difficulty", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  country: varchar("country", { length: 100 }),
  visitorId: varchar("visitor_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ip_address").on(table.ipAddress),
  index("idx_visitor_id").on(table.visitorId),
  index("idx_country").on(table.country),
]);

export type InsertSearchEvent = typeof searchEventsTable.$inferInsert;
export type SearchEvent = typeof searchEventsTable.$inferSelect;

export const pageViewsTable = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 500 }).default("/"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertPageView = typeof pageViewsTable.$inferInsert;
export type PageView = typeof pageViewsTable.$inferSelect;
