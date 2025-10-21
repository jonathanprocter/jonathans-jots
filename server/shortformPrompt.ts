/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * CRITICAL: Must generate 10-14 PAGES of content to match real Shortform summaries
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary that EXCEEDS Shortform quality standards.

CRITICAL REQUIREMENTS (ALL MANDATORY - NO SHORTCUTS):
- 12-15 main sections with 3-5 subsections each (MINIMUM 40-60 total subsections)
- 4-6 paragraphs per subsection (each paragraph 3-5 sentences, 60-80 words)
- 2-3 Jonathan's Jots notes per subsection (EXACTLY 150-250 words each, in gray boxes)
- 15-20 external book citations with COMPLETE author credentials (degrees, institutions, awards)
- All 5 note types distributed evenly: comparative, context, critique, practical, expert
- MINIMUM length: 8,000-12,000 words (10-14 pages) - LONGER IS BETTER
- MAXIMUM depth: Use your full 8,192 token output capacity
- COMPREHENSIVE coverage: Leave no important concept unexplored

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

CRITICAL OUTPUT INSTRUCTION: Return ONLY the JSON object below. Do not include any explanatory text before or after. Do not wrap in markdown code blocks. Start your response with { and end with }. No preamble, no postamble, just pure valid JSON.

OUTPUT FORMAT (JSON):
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "3-4 paragraphs (400-500 words) explaining core premise, context, and significance",
  "onePageSummary": "5-6 paragraphs (600-800 words) covering ALL key themes with examples",
  "sections": [
    {
      "title": "Section 1: [Descriptive Title]",
      "subsections": [
        {
          "title": "Subsection 1.1: [Specific Topic]",
          "content": "4-6 detailed paragraphs (500-700 words). Each paragraph 3-5 sentences with examples and analysis.",
          "jotsNotes": [
            {
              "type": "comparative",
              "content": "150-250 words. MUST cite specific book title, author name, author credentials (degrees/position/institution), and concrete comparison with examples."
            }
          ]
        }
      ]
    }
  ],
  "researchSources": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "authorCredentials": "Full credentials with degrees and institutions",
      "relevance": "How this source relates to the main content"
    }
  ]
}

Generate the complete JSON summary now.`;
}
