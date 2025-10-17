import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  Summary
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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
    throw new Error("Database not available");
  }

  await db.insert(documents).values(doc);
  const result = await db.select().from(documents).where(eq(documents.id, doc.id!)).limit(1);
  return result[0];
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: string): Promise<Document[]> {
  const db = await getDb();
  if (!db) {
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
    throw new Error("Database not available");
  }

  await db.insert(summaries).values(summary);
  const result = await db.select().from(summaries).where(eq(summaries.id, summary.id!)).limit(1);
  return result[0];
}

export async function getSummary(id: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(summaries).where(eq(summaries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSummaryByDocumentId(documentId: string): Promise<Summary | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(summaries).where(eq(summaries.documentId, documentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserSummaries(userId: string): Promise<Summary[]> {
  const db = await getDb();
  if (!db) {
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
    throw new Error("Database not available");
  }

  await db.update(summaries).set(updates).where(eq(summaries.id, id));
}

// ============= Research Sources Management =============

export async function createResearchSource(source: InsertResearchSource): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(researchSources).values(source);
}

export async function getResearchSourcesBySummaryId(summaryId: string) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(researchSources).where(eq(researchSources.summaryId, summaryId));
}

