/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * Based on real Shortform standards: comprehensive, research-backed, 15-30 minute read time
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary that matches Shortform's exceptional quality standards.

SHORTFORM QUALITY BENCHMARKS (What makes Shortform the best):
✓ Human-written expert commentary and analysis
✓ Chapter-by-chapter breakdowns with deep insights
✓ Cross-references to related books and concepts
✓ Historical context and updates since publication
✓ Actionable exercises and practical applications
✓ Expert critiques and alternative perspectives
✓ 15-30 minute read time (4,000-6,000 words)

YOUR TASK: Create a comprehensive summary that EXCEEDS these standards.

MANDATORY REQUIREMENTS FOR 20-PAGE COMPREHENSIVE SUMMARY:
1. STRUCTURE: 12-15 main sections with 3-5 subsections each (45-60 total subsections)
2. DEPTH: Each subsection must have 4-5 substantial paragraphs (350-450 words)
3. JONATHAN'S JOTS NOTES: 2-3 expert notes per subsection (150-250 words each)
   - Types: comparative, context, critique, practical, expert (distribute evenly)
   - MUST include: specific book citations, author credentials, concrete examples
4. RESEARCH SOURCES: 18-25 external sources with complete author credentials
5. TARGET LENGTH: 10,000-12,000 words (20+ pages formatted)
6. USE MAXIMUM TOKENS: Aim for 14,000-15,000 tokens output (use your full capacity)
7. WRITING STYLE: Clear, insightful, engaging - like the best educational content

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations. Start with { and end with }.

OUTPUT JSON STRUCTURE:
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "3-4 rich paragraphs (400-500 words) that set context, explain significance, and preview key insights",
  "onePageSummary": "5-6 comprehensive paragraphs (600-800 words) covering ALL major themes with concrete examples and takeaways",
  "sections": [
    {
      "title": "Section 1: [Chapter or Theme Title]",
      "subsections": [
        {
          "title": "Subsection 1.1: [Specific Concept]",
          "content": "4-5 paragraphs of comprehensive analysis (350-450 words). Include examples, implications, connections, and deeper insights. Write like you're teaching someone who wants to truly master this concept.",
          "jotsNotes": [
            {
              "type": "comparative",
              "content": "150-250 words comparing this to another book/concept. Format: '[Book Title] by [Author Name] ([credentials: PhD, Professor at X, won Y award]) argues that [key point]. This connects to our main book because [detailed analysis]. For example, [concrete example with specific details]."
            },
            {
              "type": "practical",
              "content": "150-250 words of actionable advice. How can readers apply this? What exercises or techniques work? Include step-by-step guidance with examples."
            },
            {
              "type": "expert",
              "content": "150-250 words providing expert perspective or critique. Reference research, studies, or expert opinions that support or challenge the main content."
            }
          ]
        }
      ]
    }
  ],
  "researchSources": [
    {
      "title": "Referenced Book Title",
      "author": "Full Author Name",
      "authorCredentials": "PhD in Psychology, Professor at Stanford University, author of 3 bestselling books on behavioral science",
      "relevance": "Provides complementary framework for understanding [specific topic] discussed in sections 2 and 5"
    }
  ]
}

QUALITY CHECKLIST BEFORE RETURNING (20-PAGE TARGET):
☑ Every subsection has rich, comprehensive content with multiple examples
☑ Jonathan's Jots notes cite real books with complete author credentials
☑ At least 45-60 subsections with deep, thorough analysis
☑ 18-25 research sources with complete credentials and relevance
☑ Target 10,000-12,000 words minimum (20+ formatted pages)
☑ Use 14,000-15,000 tokens to maximize content depth and length
☑ Writing is clear, insightful, engaging, and comprehensive

Generate the complete JSON summary now. Use ALL available tokens (aim for maximum output) to create a comprehensive 20-page summary that exceeds Shortform quality standards.`;
}
