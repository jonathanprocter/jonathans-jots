/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * Optimized for Claude 3.5 Sonnet's 8K token output capacity (~6,000 words)
 * Focus: Quality research notes with external book citations
 *
 * PROGRESSIVE GENERATION STRATEGY:
 * Phase 1: Overview & Outline (1,500 words)
 * Phase 2: Individual Sections (1,000-1,200 words each × 8 sections)
 * Phase 3: Research Sources (300 words)
 * Total: ~10,600 words ≈ 15-18 pages
 */

/**
 * PHASE 1: Generate overview, introduction, and section outline
 */
export function generateOverviewPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary outline.

TASK: Generate the foundational overview and structure for a comprehensive 15-page summary.

DOCUMENT TO ANALYZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

GENERATE:
1. INTRODUCTION (350-450 words)
   - Author background and credentials
   - Book's historical/cultural context
   - Core thesis and unique contribution

2. ONE-PAGE SUMMARY (500-600 words)
   - Comprehensive overview of all key themes
   - Major insights and takeaways
   - Why this book matters

3. SECTION OUTLINE (8 sections)
   - For EACH section, provide:
     * Compelling section title
     * 2-3 subsection titles that will be fully developed later
     * Brief description of what this section will cover (50 words)

CRITICAL: Return ONLY valid JSON. No markdown, no preamble, no explanation.

OUTPUT FORMAT:
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "350-450 word introduction with author context",
  "onePageSummary": "500-600 word comprehensive overview",
  "outline": [
    {
      "sectionTitle": "Section 1: [Title]",
      "subsectionTitles": ["Subsection 1.1", "Subsection 1.2", "Subsection 1.3"],
      "description": "Brief overview of what this section covers"
    }
  ]
}

Generate the complete overview now.`;
}

/**
 * PHASE 2: Generate a single comprehensive section with research notes
 */
export function generateSectionPrompt(
  documentText: string,
  bookTitle: string,
  bookAuthor: string,
  sectionTitle: string,
  subsectionTitles: string[],
  sectionDescription: string,
  sectionNumber: number,
  totalSections: number
): string {
  return `You are generating Section ${sectionNumber} of ${totalSections} for a comprehensive Jonathan's Jots summary.

BOOK CONTEXT:
- Title: ${bookTitle}
- Author: ${bookAuthor}
- Current Section: ${sectionTitle}

SUBSECTIONS TO DEVELOP:
${subsectionTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

SECTION FOCUS: ${sectionDescription}

REFERENCE TEXT:
${documentText.slice(0, 50000)}

YOUR TASK: Generate complete, in-depth content for this section following Shortform methodology.

REQUIREMENTS FOR THIS SECTION:
1. STRUCTURE:
   - ${subsectionTitles.length} subsections (one for each title above)
   - Each subsection: 300-400 words of main content
   - Each subsection: 1-2 Jonathan's Jots notes

2. JONATHAN'S JOTS NOTES (CRITICAL):
   - 100-150 words per note
   - MUST cite SPECIFIC external books
   - Include author name + credentials
   - Provide concrete comparisons/insights
   - Use varied note types: comparative, context, critique, practical, expert

3. QUALITY STANDARDS:
   - Deep analysis with concrete examples
   - Research-backed insights
   - Critical thinking and alternative perspectives
   - Connect to broader themes

EXAMPLE JOTS NOTE:
{
  "type": "comparative",
  "content": "Daniel Kahneman's *Thinking, Fast and Slow* (Kahneman is a Nobel Prize-winning psychologist) offers a complementary framework for understanding decision-making. While ${bookAuthor} emphasizes [X], Kahneman distinguishes between System 1 (fast, intuitive) and System 2 (slow, deliberate) thinking. He demonstrates through experiments that our intuitive judgments are often flawed by cognitive biases. For example, his 'availability heuristic' shows we overestimate risks that are easy to recall, like plane crashes over car accidents."
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanation.

OUTPUT FORMAT:
{
  "sectionTitle": "${sectionTitle}",
  "subsections": [
    {
      "title": "Subsection title from the list above",
      "content": "300-400 words of detailed analysis with examples",
      "jotsNotes": [
        {
          "type": "comparative|context|critique|practical|expert",
          "content": "100-150 words citing external book with author credentials"
        }
      ]
    }
  ]
}

Generate the complete section now.`;
}

/**
 * PHASE 3: Generate research sources compilation
 */
export function generateResearchSourcesPrompt(sections: any[], bookTitle: string): string {
  const allNotes = sections.flatMap(section =>
    section.subsections?.flatMap((sub: any) => sub.jotsNotes || []) || []
  );

  const notesText = allNotes.map((note: any) => note.content).join('\n\n');

  return `You are compiling the research sources for a Jonathan's Jots summary of "${bookTitle}".

TASK: Extract and format all book citations mentioned in the Jots notes below.

JOTS NOTES WITH CITATIONS:
${notesText}

For each book cited, provide:
1. Exact book title (as mentioned in notes)
2. Author name
3. Author credentials (degrees, position, expertise, awards)
4. How this source was used in the summary

CRITICAL: Return ONLY valid JSON array.

OUTPUT FORMAT:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "authorCredentials": "PhD in Psychology, Professor at Stanford, Nobel Prize winner",
    "relevance": "Provided comparative framework for understanding cognitive biases"
  }
]

Generate the research sources list now.`;
}

/**
 * LEGACY: Single-call generation (kept for backward compatibility)
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
