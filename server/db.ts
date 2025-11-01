import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  users,
  documents,
  summaries,
  researchSources,
  InsertDocument,
  InsertSummary,
  InsertResearchSource,
  Document,
  Summary,
  ResearchSource,
  User
} from "../drizzle/schema";

// Re-export types for use in other modules
export type { Document, Summary };
import { ENV } from './_core/env';

const useMemoryStore = !process.env.DATABASE_URL;

type MutableDocument = Document & { updatedAt?: Date | null };
type MutableSummary = Summary & { updatedAt?: Date | null };
type MutableResearchSource = ResearchSource;

const memoryUsers = new Map<string, User>();
const memoryDocuments = new Map<string, MutableDocument>();
const memorySummaries = new Map<string, MutableSummary>();
const memoryResearchSources = new Map<string, MutableResearchSource>();

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

/**
 * Get database connection pool configuration
 */
function getPoolConfig() {
  return {
    max: parseInt(process.env.DATABASE_POOL_SIZE || "10", 10),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || "30000", 10),
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
  };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (useMemoryStore) {
    if (!process.env.__MEMORY_DB_LOGGED) {
      console.log("[Database] Running in in-memory mode (DATABASE_URL not provided)");
      process.env.__MEMORY_DB_LOGGED = "true";
    }
    return null;
  }

  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ...getPoolConfig(),
        });
      }
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

/**
 * Close database connection pool (useful for graceful shutdown)
 */
export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db && useMemoryStore) {
    const existing = memoryUsers.get(user.id);
    const now = new Date();
    const stored: User = {
      id: user.id,
      name: user.name ?? existing?.name ?? null,
      email: user.email ?? existing?.email ?? null,
      loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
      role: user.role ?? existing?.role ?? (user.id === ENV.ownerId ? "admin" : "user"),
      createdAt: existing?.createdAt ?? now,
      lastSignedIn: user.lastSignedIn ?? existing?.lastSignedIn ?? now,
    };
    memoryUsers.set(user.id, stored);
    return;
  } else if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL uses onConflictDoUpdate instead of onDuplicateKeyUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.id,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return memoryUsers.get(id);
    }
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= Document Management =============

export async function createDocument(doc: InsertDocument): Promise<Document> {
  const db = await getDb();
  if (!db) {
    if (!useMemoryStore) {
      throw new Error("Database not available");
    }

    if (!doc.id) {
      throw new Error("Document ID is required");
    }

    const now = new Date();
    const stored: MutableDocument = {
      id: doc.id,
      userId: doc.userId!,
      originalFilename: doc.originalFilename!,
      fileType: doc.fileType!,
      fileSize: doc.fileSize!,
      storageKey: doc.storageKey!,
      storageUrl: doc.storageUrl!,
      extractedText: doc.extractedText ?? null,
      status: doc.status ?? "uploaded",
      errorMessage: doc.errorMessage ?? null,
      createdAt: doc.createdAt ?? now,
      updatedAt: doc.updatedAt ?? now,
    };

    memoryDocuments.set(doc.id, stored);
    return stored;
  }

  await db.insert(documents).values(doc);
  const result = await db.select().from(documents).where(eq(documents.id, doc.id!)).limit(1);
  return result[0];
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return memoryDocuments.get(id);
    }
    return undefined;
  }

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: string): Promise<Document[]> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return Array.from(memoryDocuments.values()).filter(doc => doc.userId === userId);
    }
    return [];
  }

  return await db.select().from(documents).where(eq(documents.userId, userId));
}

export async function updateDocumentStatus(
  id: string,
  status: "uploaded" | "processing" | "completed" | "failed",
  extractedText?: string,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      const doc = memoryDocuments.get(id);
      if (!doc) {
        throw new Error("Document not found");
      }
      doc.status = status;
      if (extractedText !== undefined) doc.extractedText = extractedText;
      if (errorMessage !== undefined) doc.errorMessage = errorMessage;
      doc.updatedAt = new Date();
      memoryDocuments.set(id, doc);
      return;
    }
    throw new Error("Database not available");
  }

  const updateData: any = { status };
  if (extractedText !== undefined) updateData.extractedText = extractedText;
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

// ============= Summary Management =============

export async function createSummary(summary: InsertSummary): Promise<Summary> {
  const db = await getDb();
  if (!db) {
    if (!useMemoryStore) {
      throw new Error("Database not available");
    }

    if (!summary.id) {
      throw new Error("Summary ID is required");
    }

    const now = new Date();
    const stored: MutableSummary = {
      id: summary.id,
      documentId: summary.documentId!,
      userId: summary.userId!,
      bookTitle: summary.bookTitle ?? null,
      bookAuthor: summary.bookAuthor ?? null,
      onePageSummary: summary.onePageSummary ?? null,
      introduction: summary.introduction ?? null,
      mainContent: summary.mainContent ?? null,
      status: summary.status ?? "generating",
      errorMessage: summary.errorMessage ?? null,
      researchSourcesCount: summary.researchSourcesCount ?? 0,
      jotsNotesCount: summary.jotsNotesCount ?? 0,
      createdAt: summary.createdAt ?? now,
      updatedAt: summary.updatedAt ?? now,
    };

    memorySummaries.set(summary.id, stored);
    return stored;
  }

  await db.insert(summaries).values(summary);
  const result = await db.select().from(summaries).where(eq(summaries.id, summary.id!)).limit(1);
  return result[0];
}

export async function getSummary(id: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return memorySummaries.get(id);
    }
    return undefined;
  }

  const result = await db.select().from(summaries).where(eq(summaries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSummaryByDocumentId(documentId: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return Array.from(memorySummaries.values()).find(summary => summary.documentId === documentId);
    }
    return undefined;
  }

  const result = await db.select().from(summaries).where(eq(summaries.documentId, documentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserSummaries(userId: string): Promise<Summary[]> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return Array.from(memorySummaries.values()).filter(summary => summary.userId === userId);
    }
    return [];
  }

  return await db.select().from(summaries).where(eq(summaries.userId, userId));
}

export async function updateSummary(
  id: string,
  updates: Partial<Omit<Summary, 'id' | 'documentId' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      const summary = memorySummaries.get(id);
      if (!summary) {
        throw new Error("Summary not found");
      }

      const updated: MutableSummary = {
        ...summary,
        ...updates,
        updatedAt: new Date(),
      };

      memorySummaries.set(id, updated);
      return;
    }
    throw new Error("Database not available");
  }

  await db.update(summaries).set(updates).where(eq(summaries.id, id));
}

// ============= Research Sources Management =============

export async function createResearchSource(source: InsertResearchSource): Promise<void> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      if (!source.id) {
        throw new Error("Research source ID is required");
      }
      const stored: MutableResearchSource = {
        id: source.id,
        summaryId: source.summaryId!,
        sourceType: source.sourceType!,
        bookTitle: source.bookTitle ?? null,
        authorName: source.authorName ?? null,
        description: source.description ?? null,
        createdAt: source.createdAt ?? new Date(),
      };
      memoryResearchSources.set(source.id, stored);
      return;
    }
    throw new Error("Database not available");
  }

  await db.insert(researchSources).values(source);
}

export async function getResearchSourcesBySummaryId(summaryId: string) {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      return Array.from(memoryResearchSources.values()).filter(source => source.summaryId === summaryId);
    }
    return [];
  }

  return await db.select().from(researchSources).where(eq(researchSources.summaryId, summaryId));
}

export async function deleteResearchSourcesBySummaryId(summaryId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    if (useMemoryStore) {
      for (const [id, source] of Array.from(memoryResearchSources.entries())) {
        if (source.summaryId === summaryId) {
          memoryResearchSources.delete(id);
        }
      }
      return;
    }
    throw new Error("Database not available");
  }

  await db.delete(researchSources).where(eq(researchSources.summaryId, summaryId));
}

export const isUsingMemoryStore = useMemoryStore;

