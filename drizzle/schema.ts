import { pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Documents uploaded for processing
 */
export const documents = pgTable("documents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 10 }).notNull(), // pdf, docx, txt, rtf
  fileSize: integer("fileSize").notNull(), // in bytes
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  extractedText: text("extractedText"), // extracted raw text
  status: varchar("status", { length: 20 }).default("uploaded").notNull(), // uploaded, processing, completed, failed
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Generated Jonathan's Jots-style summaries
 */
export const summaries = pgTable("summaries", {
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
  status: varchar("status", { length: 20 }).default("generating").notNull(), // generating, completed, failed
  errorMessage: text("errorMessage"),
  
  // AI generation metadata
  researchSourcesCount: integer("researchSourcesCount").default(0), // number of external sources cited
  jotsNotesCount: integer("jotsNotesCount").default(0), // number of research callouts
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;

/**
 * Research sources cited in summaries
 */
export const researchSources = pgTable("researchSources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  summaryId: varchar("summaryId", { length: 64 }).notNull(),
  
  sourceType: varchar("sourceType", { length: 20 }).notNull(), // book, study, expert, philosophy
  bookTitle: varchar("bookTitle", { length: 255 }),
  authorName: varchar("authorName", { length: 255 }),
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ResearchSource = typeof researchSources.$inferSelect;
export type InsertResearchSource = typeof researchSources.$inferInsert;

