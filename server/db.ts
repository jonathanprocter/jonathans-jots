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
  User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

export type { Document, Summary };

type MutableDocument = Document & { updatedAt?: Date | null };
type MutableSummary = Summary & { updatedAt?: Date | null };
type MutableResearchSource = ResearchSource;

const memoryUsers = new Map<string, User>();
const memoryDocuments = new Map<string, MutableDocument>();
const memorySummaries = new Map<string, MutableSummary>();
const memoryResearchSources = new Map<string, MutableResearchSource>();

const now = () => new Date();

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let memoryMode = false;
let memoryNoticeLogged = false;

function logMemoryMode(message: string) {
  if (!memoryNoticeLogged) {
    console.warn(`[Database] ${message}`);
    memoryNoticeLogged = true;
  }
}

function enableMemoryMode(message: string) {
  if (!memoryMode) {
    memoryMode = true;
    logMemoryMode(message);
  }
}

function getPoolConfig() {
  return {
    max: parseInt(process.env.DATABASE_POOL_SIZE || "10", 10),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || "30000", 10),
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
  };
}

export async function getDb() {
  if (memoryMode) {
    return null;
  }

  if (!_db) {
    if (!process.env.DATABASE_URL) {
      enableMemoryMode("DATABASE_URL not configured. Using in-memory data store.");
      return null;
    }

    try {
      if (!_pool) {
        _pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ...getPoolConfig(),
        });
      }
      _db = drizzle(_pool);
    } catch (error) {
      const message =
        error instanceof Error
          ? `Failed to connect: ${error.message}. Using in-memory data store.`
          : "Failed to connect to database. Using in-memory data store.";
      enableMemoryMode(message);
      _db = null;
      _pool = null;
      return null;
    }
  }

  return _db;
}

export function isUsingMemoryStore() {
  return memoryMode;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

function cloneDocument(doc: MutableDocument): Document {
  return { ...doc } as Document;
}

function cloneSummary(summary: MutableSummary): Summary {
  return { ...summary } as Summary;
}

function cloneResearchSource(source: MutableResearchSource): ResearchSource {
  return { ...source } as ResearchSource;
}

function normalizeDocumentInput(doc: InsertDocument): MutableDocument {
  if (!doc.id) throw new Error("Document ID is required");
  if (!doc.userId) throw new Error("Document userId is required");
  if (!doc.originalFilename) throw new Error("Document originalFilename is required");
  if (!doc.fileType) throw new Error("Document fileType is required");
  if (doc.fileSize === undefined || doc.fileSize === null) throw new Error("Document fileSize is required");
  if (!doc.storageKey) throw new Error("Document storageKey is required");
  if (!doc.storageUrl) throw new Error("Document storageUrl is required");

  const createdAt = doc.createdAt ?? now();
  const updatedAt = doc.updatedAt ?? createdAt;

  return {
    id: doc.id,
    userId: doc.userId,
    originalFilename: doc.originalFilename,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    storageKey: doc.storageKey,
    storageUrl: doc.storageUrl,
    extractedText: doc.extractedText ?? null,
    status: (doc.status ?? "uploaded") as MutableDocument["status"],
    errorMessage: doc.errorMessage ?? null,
    createdAt,
    updatedAt,
  };
}

function normalizeSummaryInput(summary: InsertSummary): MutableSummary {
  if (!summary.id) throw new Error("Summary ID is required");
  if (!summary.documentId) throw new Error("Summary documentId is required");
  if (!summary.userId) throw new Error("Summary userId is required");

  const createdAt = summary.createdAt ?? now();
  const updatedAt = summary.updatedAt ?? createdAt;

  return {
    id: summary.id,
    documentId: summary.documentId,
    userId: summary.userId,
    bookTitle: summary.bookTitle ?? null,
    bookAuthor: summary.bookAuthor ?? null,
    onePageSummary: summary.onePageSummary ?? null,
    introduction: summary.introduction ?? null,
    mainContent: summary.mainContent ?? null,
    status: (summary.status ?? "generating") as MutableSummary["status"],
    errorMessage: summary.errorMessage ?? null,
    researchSourcesCount: summary.researchSourcesCount ?? 0,
    jotsNotesCount: summary.jotsNotesCount ?? 0,
    createdAt,
    updatedAt,
  };
}

function normalizeResearchSourceInput(source: InsertResearchSource): MutableResearchSource {
  if (!source.id) throw new Error("Research source ID is required");
  if (!source.summaryId) throw new Error("Research source summaryId is required");
  if (!source.sourceType) throw new Error("Research source type is required");

  const createdAt = source.createdAt ?? now();

  return {
    id: source.id,
    summaryId: source.summaryId,
    sourceType: source.sourceType,
    bookTitle: source.bookTitle ?? null,
    authorName: source.authorName ?? null,
    description: source.description ?? null,
    createdAt,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const existing = memoryUsers.get(user.id);
    const timestamp = now();
    const resolvedRole = user.role ?? existing?.role ?? (user.id === ENV.ownerId ? "admin" : "user");

    const stored: User = {
      id: user.id,
      name: user.name ?? existing?.name ?? null,
      email: user.email ?? existing?.email ?? null,
      loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
      role: resolvedRole,
      createdAt: existing?.createdAt ?? timestamp,
      lastSignedIn: user.lastSignedIn ?? existing?.lastSignedIn ?? timestamp,
    };

    memoryUsers.set(user.id, stored);
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
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    } else {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

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
    const user = memoryUsers.get(id);
    return user ? { ...user } : undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createDocument(doc: InsertDocument): Promise<Document> {
  const db = await getDb();
  if (!db) {
    const normalized = normalizeDocumentInput(doc);
    memoryDocuments.set(normalized.id, normalized);
    return cloneDocument(normalized);
  }

  await db.insert(documents).values(doc);
  const result = await db.select().from(documents).where(eq(documents.id, doc.id!)).limit(1);
  return result[0];
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) {
    const doc = memoryDocuments.get(id);
    return doc ? cloneDocument(doc) : undefined;
  }

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: string): Promise<Document[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(memoryDocuments.values())
      .filter(doc => doc.userId === userId)
      .map(cloneDocument);
  }

  return await db.select().from(documents).where(eq(documents.userId, userId));
}

export async function updateDocumentStatus(
  id: string,
  status: "uploaded" | "processing" | "completed" | "failed",
  extractedText?: string,
  errorMessage?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    const existing = memoryDocuments.get(id);
    if (!existing) {
      throw new Error("Document not found");
    }

    const updated: MutableDocument = {
      ...existing,
      status,
      extractedText: extractedText ?? existing.extractedText,
      errorMessage: errorMessage ?? existing.errorMessage,
      updatedAt: now(),
    };

    memoryDocuments.set(id, updated);
    return;
  }

  const updateData: Record<string, unknown> = { status };
  if (extractedText !== undefined) updateData.extractedText = extractedText;
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function createSummary(summary: InsertSummary): Promise<Summary> {
  const db = await getDb();
  if (!db) {
    const normalized = normalizeSummaryInput(summary);
    memorySummaries.set(normalized.id, normalized);
    return cloneSummary(normalized);
  }

  await db.insert(summaries).values(summary);
  const result = await db.select().from(summaries).where(eq(summaries.id, summary.id!)).limit(1);
  return result[0];
}

export async function getSummary(id: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    const summary = memorySummaries.get(id);
    return summary ? cloneSummary(summary) : undefined;
  }

  const result = await db.select().from(summaries).where(eq(summaries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSummaryByDocumentId(documentId: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    for (const summary of Array.from(memorySummaries.values())) {
      if (summary.documentId === documentId) {
        return cloneSummary(summary);
      }
    }
    return undefined;
  }

  const result = await db
    .select()
    .from(summaries)
    .where(eq(summaries.documentId, documentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserSummaries(userId: string): Promise<Summary[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(memorySummaries.values())
      .filter(summary => summary.userId === userId)
      .map(cloneSummary);
  }

  return await db.select().from(summaries).where(eq(summaries.userId, userId));
}

export async function updateSummary(
  id: string,
  updates: Partial<Omit<Summary, "id" | "documentId" | "userId" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    const existing = memorySummaries.get(id);
    if (!existing) {
      throw new Error("Summary not found");
    }

    const updated: MutableSummary = {
      ...existing,
      ...updates,
      updatedAt: now(),
    };

    memorySummaries.set(id, updated);
    return;
  }

  await db.update(summaries).set(updates).where(eq(summaries.id, id));
}

export async function createResearchSource(source: InsertResearchSource): Promise<void> {
  const db = await getDb();
  if (!db) {
    const normalized = normalizeResearchSourceInput(source);
    memoryResearchSources.set(normalized.id, normalized);
    return;
  }

  await db.insert(researchSources).values(source);
}

export async function getResearchSourcesBySummaryId(summaryId: string) {
  const db = await getDb();
  if (!db) {
    return Array.from(memoryResearchSources.values())
      .filter(source => source.summaryId === summaryId)
      .map(cloneResearchSource);
  }

  return await db.select().from(researchSources).where(eq(researchSources.summaryId, summaryId));
}

export async function deleteResearchSourcesBySummaryId(summaryId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    for (const [id, source] of Array.from(memoryResearchSources.entries())) {
      if (source.summaryId === summaryId) {
        memoryResearchSources.delete(id);
      }
    }
    return;
  }

  await db.delete(researchSources).where(eq(researchSources.summaryId, summaryId));
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryDocuments.delete(documentId);
    return;
  }

  await db.delete(documents).where(eq(documents.id, documentId));
}

/**
 * Delete a summary by ID (also deletes associated research sources)
 */
export async function deleteSummary(summaryId: string): Promise<void> {
  // First delete associated research sources
  await deleteResearchSourcesBySummaryId(summaryId);
  
  const db = await getDb();
  if (!db) {
    memorySummaries.delete(summaryId);
    return;
  }

  await db.delete(summaries).where(eq(summaries.id, summaryId));
}
