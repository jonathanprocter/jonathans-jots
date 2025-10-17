import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Documents uploaded for processing
 */
export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "docx", "txt", "rtf"]).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  storageKey: varchar("storageKey", { length: 512 }).notNull(), // S3 key
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(), // S3 URL
  extractedText: text("extractedText"), // extracted raw text
  status: mysqlEnum("status", ["uploaded", "processing", "completed", "failed"]).default("uploaded").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Generated Jonathan's Jots-style summaries
 */
export const summaries = mysqlTable("summaries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  documentId: varchar("documentId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Book metadata
  bookTitle: varchar("bookTitle", { length: 255 }),
  bookAuthor: varchar("bookAuthor", { length: 255 }),
  
  // Summary content sections
  onePageSummary: text("onePageSummary"),
  introduction: text("introduction"),
  mainContent: text("mainContent"), // JSON structure with sections and Jots notes
  
  // Processing metadata
  status: mysqlEnum("status", ["generating", "completed", "failed"]).default("generating").notNull(),
  errorMessage: text("errorMessage"),
  
  // AI generation metadata
  researchSourcesCount: int("researchSourcesCount").default(0), // number of external sources cited
  jotsNotesCount: int("jotsNotesCount").default(0), // number of research callouts
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;

/**
 * Research sources cited in summaries
 */
export const researchSources = mysqlTable("researchSources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  summaryId: varchar("summaryId", { length: 64 }).notNull(),
  
  sourceType: mysqlEnum("sourceType", ["book", "study", "expert", "philosophy"]).notNull(),
  bookTitle: varchar("bookTitle", { length: 255 }),
  authorName: varchar("authorName", { length: 255 }),
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ResearchSource = typeof researchSources.$inferSelect;
export type InsertResearchSource = typeof researchSources.$inferInsert;

