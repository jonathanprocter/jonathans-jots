import { invokeLLM as invokeLLMWithRouting } from './_core/llmRouter';
import {
  generateOverviewPrompt,
  generateSectionPrompt,
  generateResearchSourcesPrompt
} from './shortformPrompt';
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

const progressStore = new Map<string, ProgressUpdate>();

export function getProgress(summaryId: string): ProgressUpdate | null {
  return progressStore.get(summaryId) || null;
}

/**
 * Helper function to extract and parse JSON from Claude's response
 */
function parseJSONResponse(contentText: string): any {
  console.log('[DEBUG] Response length:', contentText.length);
  console.log('[DEBUG] First 500 chars:', contentText.substring(0, 500));

  const jsonMatch = contentText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('[ERROR] Full response:', contentText);
    throw new Error('No JSON found in response');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('[ERROR] Failed to parse JSON:', jsonMatch[0].substring(0, 1000));
    throw new Error(`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`);
  }
}

/**
 * Helper function to call Claude and extract content
 */
async function callClaude(prompt: string, taskType: string): Promise<any> {
  console.log(`[Summary] Calling Claude for ${taskType}`);

  const response = await invokeLLMWithRouting({
    messages: [{ role: 'user', content: prompt }],
  }, 'summary_generation');

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  const contentText = typeof content === 'string' ? content :
    Array.isArray(content) ? content.find(c => c.type === 'text')?.text || '' : '';

  return parseJSONResponse(contentText);
}

/**
 * PROGRESSIVE GENERATION: Generate 15-20 page summaries in multiple API calls
 *
 * Strategy:
 * - Phase 1: Overview & Outline (~1,500 words)
 * - Phase 2: Individual Sections (~1,100 words each × 8 sections)
 * - Phase 3: Research Sources (~300 words)
 * Total: ~10,600 words ≈ 15-18 pages
 */
export async function generateSummaryWithProgress(
  documentId: string,
  summaryId: string,
  bookTitle?: string,
  bookAuthor?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // ========== STEP 1: Extract document ==========
    progressStore.set(summaryId, {
      stage: 'Extracting document content...',
      sectionsCompleted: 0,
      totalSections: 10,
    });

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || !doc.extractedText) {
      throw new Error('Document not found or not processed');
    }

    const documentText = doc.extractedText;

    // ========== PHASE 1: Generate Overview & Outline ==========
    progressStore.set(summaryId, {
      stage: 'Phase 1/3: Analyzing book and creating comprehensive outline...',
      sectionsCompleted: 0,
      totalSections: 10,
    });

    const overviewPrompt = generateOverviewPrompt(documentText, bookTitle, bookAuthor);
    const overview = await callClaude(overviewPrompt, 'overview generation');

    if (!overview.outline || !Array.isArray(overview.outline)) {
      throw new Error('Invalid overview: missing outline array');
    }

    const totalSections = overview.outline.length;
    const finalBookTitle = overview.bookTitle || bookTitle || 'Untitled';
    const finalBookAuthor = overview.bookAuthor || bookAuthor || 'Unknown Author';

    console.log(`[Summary] Generated outline with ${totalSections} sections`);

    // ========== PHASE 2: Generate Each Section ==========
    const completedSections: any[] = [];

    for (let i = 0; i < totalSections; i++) {
      const outlineItem = overview.outline[i];

      progressStore.set(summaryId, {
        stage: `Phase 2/3: Generating section ${i + 1} of ${totalSections} with research...`,
        sectionsCompleted: i,
        totalSections,
        currentSection: outlineItem.sectionTitle,
        partialContent: {
          bookTitle: finalBookTitle,
          bookAuthor: finalBookAuthor,
          onePageSummary: overview.onePageSummary,
          introduction: overview.introduction,
          sections: completedSections,
        },
      });

      const sectionPrompt = generateSectionPrompt(
        documentText,
        finalBookTitle,
        finalBookAuthor,
        outlineItem.sectionTitle,
        outlineItem.subsectionTitles || [],
        outlineItem.description || '',
        i + 1,
        totalSections
      );

      const section = await callClaude(sectionPrompt, `section ${i + 1}`);

      // Ensure section has correct structure
      const formattedSection = {
        title: section.sectionTitle || outlineItem.sectionTitle,
        subsections: section.subsections || []
      };

      completedSections.push(formattedSection);

      console.log(`[Summary] Completed section ${i + 1}/${totalSections}: ${formattedSection.title}`);

      // Update progress with partial content
      progressStore.set(summaryId, {
        stage: `Phase 2/3: Generated section ${i + 1} of ${totalSections}`,
        sectionsCompleted: i + 1,
        totalSections,
        currentSection: formattedSection.title,
        partialContent: {
          bookTitle: finalBookTitle,
          bookAuthor: finalBookAuthor,
          onePageSummary: overview.onePageSummary,
          introduction: overview.introduction,
          sections: completedSections,
        },
      });
    }

    // ========== PHASE 3: Generate Research Sources ==========
    progressStore.set(summaryId, {
      stage: 'Phase 3/3: Compiling research sources and citations...',
      sectionsCompleted: totalSections,
      totalSections,
    });

    const researchPrompt = generateResearchSourcesPrompt(completedSections, finalBookTitle);
    const researchSources = await callClaude(researchPrompt, 'research sources');

    console.log(`[Summary] Generated ${researchSources.length} research sources`);

    // ========== SAVE FINAL SUMMARY ==========
    const finalSummaryData = {
      bookTitle: finalBookTitle,
      bookAuthor: finalBookAuthor,
      onePageSummary: overview.onePageSummary,
      introduction: overview.introduction,
      sections: completedSections,
      researchSources: Array.isArray(researchSources) ? researchSources : []
    };

    await db
      .update(summaries)
      .set({
        bookTitle: finalBookTitle,
        bookAuthor: finalBookAuthor,
        onePageSummary: overview.onePageSummary || '',
        introduction: overview.introduction || '',
        mainContent: JSON.stringify(completedSections),
        researchSourcesCount: finalSummaryData.researchSources.length,
        jotsNotesCount: countJotsNotes(completedSections),
        status: 'completed',
      })
      .where(eq(summaries.id, summaryId));

    progressStore.set(summaryId, {
      stage: 'Complete! Generated comprehensive 15-18 page summary',
      sectionsCompleted: totalSections,
      totalSections,
      partialContent: finalSummaryData,
    });

    console.log(`[Summary] ✓ Complete: ${totalSections} sections, ${countJotsNotes(completedSections)} Jots notes, ${finalSummaryData.researchSources.length} research sources`);

    setTimeout(() => {
      progressStore.delete(summaryId);
    }, 5 * 60 * 1000);

  } catch (error: any) {
    console.error('[Summary] Generation error:', error);
    progressStore.set(summaryId, {
      stage: `Error: ${error.message}`,
      sectionsCompleted: 0,
      totalSections: 0,
    });

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
    if (section.subsections) {
      for (const subsection of section.subsections) {
        if (subsection.jotsNotes) {
          count += subsection.jotsNotes.length;
        }
      }
    }
  }
  return count;
}
