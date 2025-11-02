import { getDb } from "./db";
import { sql } from "drizzle-orm";

/**
 * Initialize database tables if they don't exist
 * This runs at server startup to ensure tables are created
 */
export async function initializeDatabase() {
  try {
    console.log("[Database] Initializing database tables...");

    const dbPromise = getDb();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database initialization timeout after 10s")), 10000)
    );
    
    const db = await Promise.race([dbPromise, timeoutPromise]) as Awaited<ReturnType<typeof getDb>>;
    if (!db) {
      throw new Error("Database not available");
    }
    
    console.log("[Database] Connected successfully, creating tables...");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name TEXT,
        email VARCHAR(320),
        "loginMethod" VARCHAR(64),
        role VARCHAR(20) DEFAULT 'user' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "lastSignedIn" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[Database] Users table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(64) PRIMARY KEY,
        "userId" VARCHAR(64) NOT NULL,
        "originalFilename" VARCHAR(255) NOT NULL,
        "fileType" VARCHAR(10) NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "storageKey" VARCHAR(512) NOT NULL,
        "storageUrl" VARCHAR(1024) NOT NULL,
        "extractedText" TEXT,
        status VARCHAR(20) DEFAULT 'uploaded' NOT NULL,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[Database] Documents table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS summaries (
        id VARCHAR(64) PRIMARY KEY,
        "documentId" VARCHAR(64) NOT NULL,
        "userId" VARCHAR(64) NOT NULL,
        "bookTitle" VARCHAR(255),
        "bookAuthor" VARCHAR(255),
        "onePageSummary" TEXT,
        introduction TEXT,
        "mainContent" TEXT,
        status VARCHAR(20) DEFAULT 'generating' NOT NULL,
        "errorMessage" TEXT,
        "researchSourcesCount" INTEGER DEFAULT 0,
        "jotsNotesCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[Database] Summaries table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "researchSources" (
        id VARCHAR(64) PRIMARY KEY,
        "summaryId" VARCHAR(64) NOT NULL,
        "sourceType" VARCHAR(20) NOT NULL,
        "bookTitle" VARCHAR(255),
        "authorName" VARCHAR(255),
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[Database] Research sources table ready");

    console.log("[Database] ✅ Database tables initialized successfully");
  } catch (error) {
    console.error("[Database] ❌ Error initializing database:", error);
    throw error;
  }
}

