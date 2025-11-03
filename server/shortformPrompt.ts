/**
 * Generate AI prompt for creating premium Jonathan's Jots summaries
 * that exceed Shortform quality standards.
 * 
 * CRITICAL FIX: Explicitly instructs LLM to ignore testimonials/reviews and use plain text formatting.
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are Jonathan's Jots, creating a premium research-backed summary that EXCEEDS Shortform quality standards.

🚨 CRITICAL CONTENT EXTRACTION RULES 🚨
YOU MUST FOLLOW THESE RULES TO AVOID GENERATING GARBAGE OUTPUT:

1. **IGNORE ALL TESTIMONIALS AND BOOK REVIEWS**
   - Skip any quotes from therapists, authors, or reviewers praising the book
   - Skip "What people are saying" sections
   - Skip endorsements and blurbs
   - These are NOT part of the book content!

2. **IGNORE PROMOTIONAL FRONT MATTER**
   - Skip copyright pages
   - Skip dedications and acknowledgments  
   - Skip "About the author" sections
   - Skip publisher information

3. **SUMMARIZE ONLY THE ACTUAL BOOK CONTENT**
   - Focus on the author's own ideas and arguments
   - Summarize the actual chapters (usually starting with Chapter 1 or Introduction)
   - Use the table of contents if present to identify real content
   - Extract the author's thesis, arguments, evidence, and conclusions

4. **USE PLAIN TEXT FORMATTING ONLY**
   - DO NOT use markdown syntax (no **, *, #, etc.)
   - DO NOT include raw quote marks or escaped characters
   - Use \n\n (actual newline characters) for paragraph breaks between paragraphs
   - Write in clear, professional prose without any special formatting

DOCUMENT TO ANALYZE:
${documentText.slice(0, 100000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : 'BOOK TITLE: Extract from document'}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : 'BOOK AUTHOR: Extract from document'}

QUALITY STANDARDS (Must EXCEED Shortform):

**Length & Depth:**
- Total summary: 4,000-6,000 words (33-50% longer than Shortform)
- One-page summary: 500-750 words
- Each subsection: 300-500 words
- Each Jonathan's Jots note: 100-150 words

**Structure:**
- 5-8 main sections (matching book chapters or themes)
- 2-4 subsections per section
- 1-2 Jonathan's Jots notes per subsection
- 8-12 research sources with full credentials

**Content Requirements:**

1. **INTRODUCTION (300-400 words, 2-3 paragraphs):**
   - Author's background and credibility
   - Book's core thesis
   - Why this book matters
   - What readers will learn
   - Use \n\n (actual newlines) between paragraphs

2. **ONE-PAGE SUMMARY (500-750 words, 4-6 paragraphs):**
   - Core thesis statement
   - 3-5 main arguments with explanations
   - Key supporting evidence from the book
   - Critical takeaways
   - Practical implications
   - Use \n\n (actual newlines) between paragraphs

3. **DETAILED SECTIONS (5-8 sections):**
   Each section contains:
   - Clear title (e.g., "Chapter 1: Understanding Emotional Immaturity")
   - 2-4 subsections with specific concepts
   - Each subsection: 300-500 words explaining the concept
   - Include specific examples and evidence from the book
   - Use \n\n (actual newlines) for paragraph breaks

4. **JONATHAN'S JOTS NOTES (100-150 words each):**
   Five types of notes:
   - **Comparative**: Compare to other research or frameworks
   - **Context**: Historical, cultural, or scientific context
   - **Critique**: Evaluate arguments, present counterarguments
   - **Practical**: Implementation techniques and frameworks
   - **Expert**: Insights from related fields
   
   Each note must:
   - Provide substantive critical analysis
   - Reference specific research or experts
   - Add value beyond the book's content
   - Be 100-150 words of plain text

5. **RESEARCH SOURCES (8-12 sources):**
   - Credible books, studies, or expert perspectives
   - Full author credentials (PhD, institution, position)
   - Clear relevance to the book's themes
   - Mix of supporting and challenging viewpoints

**Critical Analysis:**
- Evaluate the strength of arguments
- Present alternative perspectives
- Discuss limitations of research
- Note outdated or contested findings
- Distinguish correlation from causation

**Actionability:**
- Specific, implementable techniques
- Step-by-step frameworks
- Examples of successful implementation
- Common pitfalls to avoid

**Scholarly Rigor:**
- Cite specific studies with methodology
- Verify claims against current research
- Reference meta-analyses when available
- Note when findings are preliminary

REQUIRED JSON OUTPUT FORMAT:
{
  "bookTitle": "Exact title of the book",
  "bookAuthor": "Full name of the author",
  "introduction": "2-3 paragraphs (300-400 words total) in plain text. Use \n\n (actual newline characters) between paragraphs. NO markdown syntax.",
  "onePageSummary": "4-6 paragraphs (500-750 words total) in plain text. Use \n\n (actual newline characters) between paragraphs. NO markdown syntax.",
  "sections": [
    {
      "title": "Section or Chapter Title",
      "subsections": [
        {
          "title": "Specific Concept or Key Insight",
          "content": "300-500 words in plain text explaining this concept. Use \n\n (actual newlines) for paragraph breaks. NO markdown syntax.",
          "jotsNotes": [
            {
              "type": "jonathans_jots_note",
              "noteType": "Comparative|Context|Critique|Practical|Expert",
              "content": "100-150 words of critical analysis in plain text. NO markdown syntax.",
              "sources": [
                {
                  "title": "Full title of research source",
                  "author": "Author name",
                  "authorCredentials": "Complete credentials",
                  "url": "https://example.com/source"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "researchSources": [
    {
      "title": "Full title of credible source",
      "author": "Author name",
      "authorCredentials": "Complete credentials (PhD, position, institution)",
      "relevance": "How this source supports or challenges the book's arguments"
    }
  ]
}

CRITICAL REMINDERS:
✓ Summarize ACTUAL BOOK CONTENT (not testimonials or reviews)
✓ Use PLAIN TEXT ONLY (no markdown syntax like **, *, #, etc.)
✓ 4,000-6,000 total words
✓ 8-12 research sources
✓ 100-150 word Jonathan's Jots notes
✓ Valid JSON structure
✓ Use \n\n (actual newline characters) for paragraph breaks, NOT \\n\\n

Return ONLY the JSON object (no markdown code blocks, no extra text):`;
}
