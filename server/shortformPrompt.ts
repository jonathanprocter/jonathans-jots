/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * Optimized for Claude 3.5 Sonnet's 8K token output capacity (~6,000 words)
 * Focus: Quality research notes with external book citations
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary that matches Shortform quality standards.

CRITICAL REQUIREMENTS - SHORTFORM METHODOLOGY:
Your summary MUST include:

1. STRUCTURE (Achievable in 8K tokens):
   - 6-8 main sections covering all key themes
   - 2-3 subsections per section (15-20 total subsections)
   - Each subsection: 3-4 paragraphs (300-400 words) with clear examples
   - Target length: 5,500-6,500 words (use your full 8,192 token capacity)

2. JONATHAN'S JOTS NOTES (THE KEY DIFFERENTIATOR):
   - 1-2 research notes per subsection (20-30 notes total)
   - Each note: 100-150 words
   - MUST cite SPECIFIC external books with:
     * Exact book title (e.g., "*Atomic Habits*")
     * Author name with credentials (e.g., "James Clear, habit researcher")
     * How it relates/compares to the main book's ideas
   - Use all 5 note types: comparative, context, critique, practical, expert

3. RESEARCH CITATIONS (MANDATORY):
   - Cite 10-15 external books throughout your notes
   - Include author credentials: degrees, institutions, expertise areas
   - Provide concrete comparisons and cross-references

4. QUALITY OVER QUANTITY:
   - Deep analysis, not surface-level summary
   - Real examples from cited sources
   - Critical thinking and alternative perspectives

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

CRITICAL OUTPUT INSTRUCTION: Return ONLY the JSON object below. Do not include any explanatory text before or after. Do not wrap in markdown code blocks. Start your response with { and end with }. No preamble, no postamble, just pure valid JSON.

OUTPUT FORMAT (JSON):
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "3-4 paragraphs (350-450 words) with author background and book context",
  "onePageSummary": "4-5 paragraphs (500-600 words) covering key themes",
  "sections": [
    {
      "title": "Section 1: [Descriptive Title]",
      "subsections": [
        {
          "title": "Subsection 1.1: [Specific Topic]",
          "content": "3-4 detailed paragraphs (300-400 words) with examples and analysis",
          "jotsNotes": [
            {
              "type": "comparative",
              "content": "100-150 words citing specific external book: '*Book Title* by Author Name (credentials). [Explain how it compares/relates with concrete examples]'"
            },
            {
              "type": "practical",
              "content": "100-150 words citing another source with actionable insights"
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
      "authorCredentials": "Degrees, position, institution, or expertise area",
      "relevance": "How this source was used in the summary"
    }
  ]
}

EXAMPLE JOTS NOTE (Follow this format):
{
  "type": "comparative",
  "content": "James Clear's *Atomic Habits* (Clear is a habit researcher and speaker) offers a complementary framework. While [main book] focuses on [X], Clear emphasizes the compound effect of small changes. He suggests starting with 'tiny habits' - making changes so small they're impossible to fail at. For example, if you want to read more, start by reading just one page per day."
}

Generate the complete JSON summary now.`;
}
