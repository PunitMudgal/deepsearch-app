import {relations, sql } from "drizzle-orm";
import {
    index,
    integer,
    pgTableCreator,
    primaryKey,
    text,
    timestamp,
    varchar,
    json,
    boolean,
    serial,
  } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `deepsearch_${name}`);

export const users = createTable("user", {
    id: varchar("id", { length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: timestamp("email_verified", {
      mode: "date",
      withTimezone: true,
    }).default(sql`CURRENT_TIMESTAMP`),
    image: varchar("image", { length: 255 }),
    isAdmin: boolean("is_admin").notNull().default(false),
})