import { pgTable, serial, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";

export const recipeFeedbackTable = pgTable("recipe_feedback", {
  id: serial("id").primaryKey(),
  recipeName: varchar("recipe_name", { length: 500 }).notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertRecipeFeedback = typeof recipeFeedbackTable.$inferInsert;
export type RecipeFeedback = typeof recipeFeedbackTable.$inferSelect;
