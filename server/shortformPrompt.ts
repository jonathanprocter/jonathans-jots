/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * Based on analysis of real Shortform summaries (The Antidote, The Righteous Mind, The Surrender Experiment)
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary in the EXACT style of Shortform summaries.

CRITICAL REQUIREMENTS:
1. Generate 8-12 SPECIFIC citations to OTHER books (not the main book)
2. Include author credentials for EVERY citation (e.g., "Daniel Kahneman, Nobel laureate in economics")
3. Insert a Jonathan's Jots note every 2-4 paragraphs
4. Create 8-12 main sections, each with 2-4 subsections
5. Use comparative analysis, critical perspectives, and practical implementation

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

OUTPUT FORMAT (JSON):
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "2-3 paragraphs explaining the book's core premise and significance",
  "onePageSummary": "Condensed overview in 3-4 paragraphs covering all key themes",
  "sections": [
    {
      "title": "Section Title (e.g., 'The First Agreement: Be Impeccable With Your Word')",
      "subsections": [
        {
          "title": "Subsection Title (e.g., 'Understanding the Power of Words')",
          "content": "2-4 paragraphs of detailed content. MUST include inline Jonathan's Jots notes.",
          "jotsNotes": [
            {
              "type": "comparative | context | critique | practical | expert",
              "content": "Full Jonathan's Jots note with specific book citation, author credentials, and detailed analysis"
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
      "authorCredentials": "Brief credentials (e.g., 'psychologist and bestselling author')",
      "relevance": "How this source relates to the main book"
    }
  ]
}

JONATHAN'S JOTS NOTE EXAMPLES (USE THESE AS TEMPLATES):

**Comparative Analysis:**
"(Jonathan's Jots note: In *Thinking, Fast and Slow*, Daniel Kahneman, Nobel laureate in economics, expands on this concept by distinguishing between System 1 (fast, intuitive thinking) and System 2 (slow, deliberate thinking). Kahneman argues that many of our judgments are made by System 1, which is prone to cognitive biases. He provides specific strategies for engaging System 2: • Deliberately slow down decision-making • Question your initial intuitions • Seek contradictory evidence • Use checklists for important decisions. This framework helps explain why the practices described in this book are so effective—they essentially train us to engage System 2 more frequently.)"

**Biographical Context:**
"(Jonathan's Jots note: The author, [Name], is a [credentials]. Their background in [field] began when [significant event]. This perspective is particularly valuable because [why it matters]. Other experts in this field, such as [Name 2] (*[Book Title]*) and [Name 3] (*[Book Title]*), have built upon these foundations, though they emphasize [different aspect].)"

**Critical Analysis:**
"(Jonathan's Jots note: While the author recommends [specific advice], some experts caution against this approach. In *[Book Title]*, [Author], a [credentials], argues that [counterargument]. They point to research showing [evidence]. Similarly, [Author 2] in *[Book Title 2]* suggests [alternative approach]. These perspectives suggest that [nuanced conclusion].)"

**Practical Implementation:**
"(Jonathan's Jots note: For readers seeking concrete strategies to implement this principle, *[Book Title]* by [Author], a [credentials], offers a practical framework: • [Specific step 1 with details] • [Specific step 2 with details] • [Specific step 3 with details]. [Author] tested these strategies with [specific group] and found [specific results]. This systematic approach can help bridge the gap between understanding the concept and actually applying it in daily life.)"

**Expert Perspective:**
"(Jonathan's Jots note: [Expert Name], [credentials], provides additional context in *[Book Title]*. They explain that [detailed explanation of underlying mechanism/theory]. This is supported by research from [Institution/Study], which found [specific findings]. Understanding this deeper mechanism helps explain why [connection to main book's advice].)"

MANDATORY REQUIREMENTS:
✓ 8-12 main sections, each with 2-4 subsections
✓ 8-12 external book citations (specific titles, not generic references)
✓ Author credentials for EVERY citation
✓ Jonathan's Jots note every 2-4 paragraphs
✓ Mix of all 5 note types (comparative, context, critique, practical, expert)
✓ Specific examples and strategies from cited sources
✓ 2-3 paragraph introduction
✓ 3-4 paragraph one-page summary
✓ Deep research methodology matching Shortform quality

Generate the complete JSON summary now.`;
}
