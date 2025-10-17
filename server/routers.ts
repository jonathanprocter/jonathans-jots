import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createDocument, 
  getDocument, 
  getUserDocuments,
  updateDocumentStatus,
  createSummary,
  getSummary,
  getSummaryByDocumentId,
  getUserSummaries,
  updateSummary,
  createResearchSource,
  getResearchSourcesBySummaryId
} from "./db";
import { storagePut } from "./storage";
import { processDocument, getFileType, validateFileSize } from "./documentProcessor";
import { generateJotsPrompt, parseSummaryResponse } from "./shortformPrompt";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";

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

        // Validate file type
        const fileType = getFileType(filename);
        if (!fileType) {
          throw new Error('Unsupported file type. Please upload .pdf, .docx, .txt, or .rtf files.');
        }

        // Validate file size
        if (!validateFileSize(fileSize)) {
          throw new Error('File size exceeds 10MB limit.');
        }

        // Decode base64 file data
        const buffer = Buffer.from(fileData, 'base64');

        // Upload to S3
        const storageKey = `documents/${userId}/${nanoid()}-${filename}`;
        const { url: storageUrl } = await storagePut(storageKey, buffer, getMimeType(fileType));

        // Create document record
        const documentId = nanoid();
        const document = await createDocument({
          id: documentId,
          userId,
          originalFilename: filename,
          fileType,
          fileSize,
          storageKey,
          storageUrl,
          status: 'uploaded',
        });

        // Process document asynchronously
        processDocumentAsync(documentId, buffer, fileType).catch(error => {
          console.error('Document processing failed:', error);
          updateDocumentStatus(documentId, 'failed', undefined, error.message);
        });

        return {
          success: true,
          documentId: document.id,
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
        
        if (!document) {
          throw new Error('Document not found');
        }

        const userId = ctx.user?.id || 'anonymous';
        if (document.userId !== userId) {
          throw new Error('Unauthorized access to document');
        }

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

        // Generate summary asynchronously
        generateSummaryAsync(summaryId, document.extractedText, bookTitle, bookAuthor).catch(error => {
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
        return summaries;
      }),

    // Get a specific summary with research sources
    get: publicProcedure
      .input(z.object({
        summaryId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const summary = await getSummary(input.summaryId);
        
        if (!summary) {
          throw new Error('Summary not found');
        }

        const userId = ctx.user?.id || 'anonymous';
        if (summary.userId !== userId) {
          throw new Error('Unauthorized access to summary');
        }

        const researchSources = await getResearchSourcesBySummaryId(input.summaryId);

        return {
          ...summary,
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
        if (!document || document.userId !== userId) {
          throw new Error('Document not found or unauthorized');
        }

        const summary = await getSummaryByDocumentId(input.documentId);
        if (!summary) {
          return null;
        }

        const researchSources = await getResearchSourcesBySummaryId(summary.id);

        return {
          ...summary,
          researchSources,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ============= Helper Functions =============

function getMimeType(fileType: string): string {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    case 'rtf':
      return 'application/rtf';
    default:
      return 'application/octet-stream';
  }
}

async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt' | 'rtf'
): Promise<void> {
  try {
    await updateDocumentStatus(documentId, 'processing');

    const result = await processDocument(buffer, fileType);

    if (!result.success) {
      throw new Error(result.error || 'Document processing failed');
    }

    await updateDocumentStatus(documentId, 'completed', result.text);
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

async function generateSummaryAsync(
  summaryId: string,
  extractedText: string,
  bookTitle?: string,
  bookAuthor?: string
): Promise<void> {
  try {
    // Generate the prompt
    const prompt = generateJotsPrompt({
      extractedText,
      bookTitle,
      bookAuthor,
    });

    // Call LLM to generate summary
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating premium Shortform-style book summaries with deep research and external citations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_object',
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    const aiResponseText = typeof messageContent === 'string' ? messageContent : '';
    
    // Parse the response
    const parsed = parseSummaryResponse(aiResponseText);

    // Update summary with generated content
    await updateSummary(summaryId, {
      bookTitle: parsed.bookTitle,
      bookAuthor: parsed.bookAuthor,
      onePageSummary: parsed.onePageSummary,
      introduction: parsed.introduction,
      mainContent: parsed.mainContent,
      researchSourcesCount: parsed.researchSources.length,
      jotsNotesCount: parsed.jotsNotesCount,
      status: 'completed',
    });

    // Save research sources
    for (const source of parsed.researchSources) {
      await createResearchSource({
        id: nanoid(),
        summaryId,
        sourceType: source.sourceType,
        bookTitle: source.bookTitle || null,
        authorName: source.authorName || null,
        description: source.description || null,
      });
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

