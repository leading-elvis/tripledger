import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull().unique(),
});
export const ledgers = sqliteTable("ledgers", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull().references(() => accounts.id),
  revision: integer("revision").notNull().default(1),
  document: text("document").notNull(),
  // Live account bindings and invitation secrets never enter portable backups.
  access: text("access").notNull().default('{}'),
}, (table) => [index("idx_ledgers_owner").on(table.owner)]);
