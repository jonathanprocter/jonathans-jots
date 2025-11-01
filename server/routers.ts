import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  getDocument, 
  getUserDocuments,
  createSummary,
  getSummary,
  getSummaryByDocumentId,
  getUserSummaries,
  updateSummary,
  createResearchSource,
  getResearchSourcesBySummaryId,
  Document,
  Summary
} from "./db";
import { handleDocumentUpload, getMimeType } from "./documentUploadService";
import { generateShortformPrompt,  } from "./shortformPrompt";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";

// Helper to count total jots notes across all sections
function countJotsNotes(parsed: any): number {
  let count = 0;
  if (parsed.sections) {
    for (const section of parsed.sections) {
      if (section.subsections) {
        for (const subsection of section.subsections) {
          if (subsection.jotsNotes) {
            count += subsection.jotsNotes.length;
          }
        }
      }
    }
  }
  return count;
}
import { generateSummaryWithProgress, getProgress } from "./progressiveSummary";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  documents: router({
    // Upload and process a document
    upload: publicProcedure
      .input(z.object({
        filename: z.string(),
        fileData: z.string(), // base64 encoded file data
        fileSize: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { filename, fileData, fileSize } = input;
        const userId = ctx.user?.id || 'anonymous';

        const buffer = Buffer.from(fileData, 'base64');

        const { documentId } = await handleDocumentUpload({
          filename,
          buffer,
          fileSize,
          userId,
        });

        return {
          success: true,
          documentId,
          message: 'Document uploaded successfully. Processing has started.',
        };
      }),

    // Get user's documents
    list: publicProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id || 'anonymous';
        const documents = await getUserDocuments(userId);
        return documents;
      }),

    // Get a specific document
    get: publicProcedure
      .input(z.object({
        documentId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const document = await getDocument(input.documentId);
        const userId = ctx.user?.id || 'anonymous';
        
        verifyDocumentAccess(document, userId);

        return document;
      }),
  }),

  summaries: router({
    // Generate a Shortform-style summary for a document
    generate: publicProcedure
      .input(z.object({
        documentId: z.string(),
        bookTitle: z.string().optional(),
        bookAuthor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { documentId, bookTitle, bookAuthor } = input;
        const userId = ctx.user?.id || 'anonymous';

        // Get the document
        const document = await getDocument(documentId);
        if (!document) {
          throw new Error('Document not found');
        }

        if (document.userId !== userId) {
          throw new Error('Unauthorized access to document');
        }

        if (document.status !== 'completed') {
          throw new Error('Document processing not completed yet');
        }

        if (!document.extractedText) {
          throw new Error('No text extracted from document');
        }

        // Check if summary already exists
        const existingSummary = await getSummaryByDocumentId(documentId);
        if (existingSummary) {
          return {
            success: true,
            summaryId: existingSummary.id,
            message: 'Summary already exists for this document',
          };
        }

        // Create summary record
        const summaryId = nanoid();
        await createSummary({
          id: summaryId,
          documentId,
          userId,
          bookTitle: bookTitle || null,
          bookAuthor: bookAuthor || null,
          status: 'generating',
        });

        // Generate summary with progress tracking
        generateSummaryWithProgress(documentId, summaryId, bookTitle, bookAuthor).catch(error => {
          console.error('Summary generation failed:', error);
          updateSummary(summaryId, {
            status: 'failed',
            errorMessage: error.message,
          });
        });

        return {
          success: true,
          summaryId,
          message: 'Summary generation started',
        };
      }),

    // Get user's summaries
    list: publicProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.user?.id || 'anonymous';
        const summaries = await getUserSummaries(userId);
        // Parse mainContent JSON for each summary
        return summaries.map(summary => ({
          ...summary,
          mainContent: parseSummaryContent(summary.mainContent),
        }));
      }),

    // Get a specific summary with research sources
    get: publicProcedure
      .input(z.object({
        summaryId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const summary = await getSummary(input.summaryId);
        const userId = ctx.user?.id || 'anonymous';
        
        verifySummaryAccess(summary, userId);
        
        const researchSources = await getResearchSourcesBySummaryId(input.summaryId);

        return {
          ...summary!,
          mainContent: parseSummaryContent(summary!.mainContent),
          researchSources,
        };
      }),

    // Get summary by document ID
    getByDocument: publicProcedure
      .input(z.object({
        documentId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id || 'anonymous';
        const document = await getDocument(input.documentId);
        
        verifyDocumentAccess(document, userId);

        const summary = await getSummaryByDocumentId(input.documentId);
        if (!summary) {
          return null;
        }

        const researchSources = await getResearchSourcesBySummaryId(summary.id);

        return {
          ...summary,
          mainContent: parseSummaryContent(summary.mainContent),
          researchSources,
        };
      }),

    // Get generation progress
    progress: publicProcedure
      .input(z.object({
        summaryId: z.string(),
      }))
      .query(async ({ input }) => {
        const progress = getProgress(input.summaryId);
        return progress || {
          stage: 'Initializing...',
          sectionsCompleted: 0,
          totalSections: 0,
        };
      }),
  }),

  // Storage endpoint for serving uploaded files
  storage: router({
    get: publicProcedure
      .input(z.object({
        key: z.string(),
      }))
      .query(async ({ input }) => {
        const { storageGetFile } = await import('./storage');
        const buffer = await storageGetFile(input.key);
        // Return base64 encoded data
        return {
          data: buffer.toString('base64'),
          contentType: getMimeType(input.key.split('.').pop() || ''),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ============= Helper Functions =============
/**
 * Safely parse JSON content from summary with error handling
 */
function parseSummaryContent(content: string | null): any {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse summary content:', error);
    return null;
  }
}

/**
 * Verify user authorization for document access
 */
function verifyDocumentAccess(document: Document | undefined, userId: string): void {
  if (!document) {
    throw new Error('Document not found');
  }
  if (document.userId !== userId) {
    throw new Error('Unauthorized access to document');
  }
}

/**
 * Verify user authorization for summary access
 */
function verifySummaryAccess(summary: Summary | undefined, userId: string): void {
  if (!summary) {
    throw new Error('Summary not found');
  }
  if (summary.userId !== userId) {
    throw new Error('Unauthorized access to summary');
  }
}

