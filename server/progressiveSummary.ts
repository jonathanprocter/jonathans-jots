import { invokeLLM } from './_core/llm';
import { generateShortformPrompt } from './shortformPrompt';
import { getDb } from './db';
import { documents, summaries } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface ProgressUpdate {
  stage: string;
  sectionsCompleted: number;
  totalSections: number;
  currentSection?: string;
  partialContent?: any;
}

// Store progress updates in memory (in production, use Redis or similar)
const progressStore = new Map<string, ProgressUpdate>();

export function getProgress(summaryId: string): ProgressUpdate | null {
  return progressStore.get(summaryId) || null;
}

export async function generateSummaryWithProgress(
  documentId: string,
  summaryId: string,
  bookTitle?: string,
  bookAuthor?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Initialize progress
    progressStore.set(summaryId, {
      stage: 'Extracting document content...',
      sectionsCompleted: 0,
      totalSections: 0,
    });

    // Get document
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || !doc.extractedText) {
      throw new Error('Document not found or not processed');
    }

    progressStore.set(summaryId, {
      stage: 'Analyzing content and researching related books...',
      sectionsCompleted: 0,
      totalSections: 10, // Estimated
    });

    // Generate prompt
    const prompt = generateShortformPrompt(doc.extractedText, bookTitle || undefined, bookAuthor || undefined);

    progressStore.set(summaryId, {
      stage: 'AI is generating comprehensive summary with research...',
      sectionsCompleted: 0,
      totalSections: 10,
    });

    // Call LLM
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    // Handle content type (string or array)
    const contentText = typeof content === 'string' ? content : 
      Array.isArray(content) ? content.find(c => c.type === 'text')?.text || '' : '';

    // Parse JSON
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response: No JSON found in response');
    }

    let summaryData;
    try {
      summaryData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse AI response JSON: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }

    // Validate required fields
    if (!summaryData.sections || !Array.isArray(summaryData.sections)) {
      throw new Error('Invalid AI response: missing or invalid sections array');
    }

    // Update progress as we process sections
    const totalSections = summaryData.sections.length;
    
    for (let i = 0; i < totalSections; i++) {
      progressStore.set(summaryId, {
        stage: 'Processing sections...',
        sectionsCompleted: i + 1,
        totalSections,
        currentSection: summaryData.sections[i]?.title || `Section ${i + 1}`,
        partialContent: {
          bookTitle: summaryData.bookTitle,
          bookAuthor: summaryData.bookAuthor,
          onePageSummary: summaryData.onePageSummary,
          introduction: summaryData.introduction,
          sections: summaryData.sections.slice(0, i + 1),
        },
      });
    }

    // Save to database
    await db
      .update(summaries)
      .set({
        bookTitle: summaryData.bookTitle || bookTitle || 'Untitled',
        bookAuthor: summaryData.bookAuthor || bookAuthor || 'Unknown Author',
        onePageSummary: summaryData.onePageSummary || '',
        introduction: summaryData.introduction || '',
        mainContent: JSON.stringify(summaryData.sections || []),
        researchSourcesCount: summaryData.researchSources?.length || 0,
        jotsNotesCount: countJotsNotes(summaryData.sections || []),
        status: 'completed',
      })
      .where(eq(summaries.id, summaryId));

    progressStore.set(summaryId, {
      stage: 'Complete!',
      sectionsCompleted: totalSections,
      totalSections,
      partialContent: summaryData,
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      progressStore.delete(summaryId);
    }, 5 * 60 * 1000);

  } catch (error: any) {
    console.error('Generation error:', error);
    progressStore.set(summaryId, {
      stage: `Error: ${error.message}`,
      sectionsCompleted: 0,
      totalSections: 0,
    });
    
    // Update database status
    const db = await getDb();
    if (db) {
      await db
        .update(summaries)
        .set({ status: 'failed' })
        .where(eq(summaries.id, summaryId));
    }
  }
}

function countJotsNotes(sections: any[]): number {
  let count = 0;
  for (const section of sections) {
    if (section.content) {
      for (const item of section.content) {
        if (item.type === 'shortform_note') {
          count++;
        }
      }
    }
  }
  return count;
}

