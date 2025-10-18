/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * CRITICAL: Must generate 10-14 PAGES of content to match real Shortform summaries
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary in the EXACT style of Shortform summaries.

CRITICAL LENGTH REQUIREMENT: Generate 10-14 PAGES of content (approximately 8,000-12,000 words)

MANDATORY STRUCTURE:
1. **12-15 main sections** covering all aspects of the book
2. **3-5 subsections per section** with detailed analysis
3. **4-6 paragraphs per subsection** (each paragraph 3-5 sentences)
4. **2-3 Jonathan's Jots notes per subsection** in gray boxes
5. **15-20 external book citations** with author credentials
6. **Mix of all 5 note types**: comparative, context, critique, practical, expert

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

OUTPUT FORMAT (JSON):
{
  "bookTitle": "string",
  "bookAuthor": "string",
  "introduction": "3-4 paragraphs (400-500 words) explaining the book's core premise, historical context, and significance",
  "onePageSummary": "5-6 paragraphs (600-800 words) condensed overview covering ALL key themes with specific examples",
  "sections": [
    {
      "title": "Section Title (e.g., 'Chapter 1: The First Agreement - Be Impeccable With Your Word')",
      "subsections": [
        {
          "title": "Subsection Title (e.g., 'Understanding the Power of Words in Daily Life')",
          "content": "4-6 detailed paragraphs (500-700 words). Each paragraph should be 3-5 sentences with specific examples, quotes, and analysis.",
          "jotsNotes": [
            {
              "type": "comparative | context | critique | practical | expert",
              "content": "DETAILED Jonathan's Jots note (150-250 words) with specific book citation, author credentials, concrete examples, and deep analysis. Must reference at least one other book by title and author."
            },
            {
              "type": "comparative | context | critique | practical | expert",
              "content": "Another detailed note with different perspective"
            }
          ]
        },
        {
          "title": "Another Subsection Title",
          "content": "4-6 paragraphs...",
          "jotsNotes": [...]
        }
        // 3-5 subsections total per section
      ]
    }
    // 12-15 sections total
  ],
  "researchSources": [
    {
      "title": "Specific Book Title (e.g., 'Thinking, Fast and Slow')",
      "author": "Full Author Name (e.g., 'Daniel Kahneman')",
      "authorCredentials": "Detailed credentials (e.g., 'Nobel Prize-winning psychologist and professor emeritus at Princeton University')",
      "relevance": "2-3 sentences explaining how this source relates to and expands upon the main book's themes"
    }
    // 15-20 sources minimum
  ]
}

JONATHAN'S JOTS NOTE EXAMPLES (150-250 WORDS EACH):

**Comparative Analysis Example:**
"(Jonathan's Jots note: In *Thinking, Fast and Slow*, Daniel Kahneman, Nobel laureate in economics and professor emeritus at Princeton University, expands significantly on this concept by distinguishing between System 1 (fast, intuitive thinking) and System 2 (slow, deliberate thinking). Kahneman's research, conducted over four decades with his colleague Amos Tversky, demonstrates that many of our judgments are made by System 1, which operates automatically and is prone to systematic cognitive biases. He provides specific, evidence-based strategies for engaging System 2 more effectively: • Deliberately slow down decision-making processes, especially for important choices • Actively question your initial intuitions and gut feelings • Systematically seek contradictory evidence that challenges your assumptions • Use structured checklists for complex or high-stakes decisions • Implement 'pre-mortems' to identify potential failure points before committing. This framework helps explain why the practices described in this book are so effective—they essentially train us to engage System 2 more frequently in situations where System 1 might lead us astray. Similarly, *Predictably Irrational* by Dan Ariely, a behavioral economist at Duke University, provides complementary insights into how our automatic thinking patterns can be systematically manipulated, offering additional context for understanding the importance of conscious, deliberate thought.)"

**Biographical Context Example:**
"(Jonathan's Jots note: The author, [Name], is a [detailed credentials including education, career highlights, and major accomplishments]. Their background in [specific field] began when [significant formative event or experience that shaped their perspective]. This unique perspective is particularly valuable because [specific reasons why their background matters for this topic]. The author's work builds upon foundational research by [Pioneer Name] in the [decade]s, who first identified [key concept]. Other contemporary experts in this field, such as [Name 2], author of *[Book Title]* and professor at [Institution], and [Name 3], whose *[Book Title 2]* became a bestseller in [year], have built upon these foundations while emphasizing [different aspects or approaches]. What distinguishes this author's approach is [specific unique contribution], which draws from their experience [specific relevant experience]. This interdisciplinary perspective, combining [field 1] with [field 2], offers readers a more comprehensive understanding than works focused solely on [single aspect].)"

**Critical Analysis Example:**
"(Jonathan's Jots note: While the author recommends [specific advice or approach], several experts in the field caution against applying this universally. In *[Book Title]*, [Author Name], a [credentials including institution and specialization], argues that [specific counterargument with reasoning]. They point to longitudinal research conducted at [Institution] showing [specific evidence or findings that contradict or complicate the main book's claims]. For instance, a [year] study of [specific population] found that [specific results]. Similarly, [Author 2] in *[Book Title 2]*, drawing from [their specific expertise], suggests [alternative approach or modification]. They emphasize that [important nuance or condition]. [Author 3]'s work in *[Book Title 3]* adds another layer, demonstrating that [additional complicating factor]. These perspectives suggest that while the author's advice may be effective for [specific contexts or populations], readers should consider [modifications or additional factors] when applying these principles to [different contexts]. A more nuanced approach might involve [specific recommendations that synthesize different viewpoints].)"

**Practical Implementation Example:**
"(Jonathan's Jots note: For readers seeking concrete, actionable strategies to implement this principle in their daily lives, *[Book Title]* by [Author Name], a [credentials], offers a highly practical framework that has been tested with [specific groups or in specific contexts]. The author recommends: • [Specific step 1 with detailed instructions, including when, where, and how to do it] • [Specific step 2 with concrete examples of what this looks like in practice] • [Specific step 3 with common pitfalls to avoid and how to overcome them] • [Specific step 4 with metrics or indicators to track progress]. [Author] tested these strategies with [specific group, e.g., 'over 500 corporate executives'] over [time period] and found [specific, measurable results]. Additionally, *[Book Title 2]* by [Author 2], a [credentials], provides complementary tools such as [specific tools or techniques], which can be particularly helpful for [specific situations or challenges]. For those who prefer a more structured approach, [Author 3]'s *[Book Title 3]* offers [specific resource, such as worksheets, templates, or a step-by-step program]. This systematic, evidence-based approach can help bridge the gap between understanding the concept intellectually and actually applying it consistently in daily life.)"

**Expert Perspective Example:**
"(Jonathan's Jots note: [Expert Name], [detailed credentials including current position, major achievements, and relevant expertise], provides crucial additional context in *[Book Title]*. They explain that [detailed explanation of underlying mechanism, theory, or principle], drawing from [specific field of study or research tradition]. This understanding is grounded in [specific research or theoretical framework], which has been developed over [time period] by researchers at institutions including [specific universities or research centers]. The expert points to [specific studies or evidence], including a landmark [year] study published in [journal or venue] that found [specific findings]. Understanding this deeper mechanism helps explain why [connection to main book's advice or claims]. Furthermore, research from [Institution 2] has shown that [additional supporting evidence or nuance]. [Expert 2], author of *[Book Title 2]* and [credentials], extends this analysis by demonstrating [additional insight or application]. Their work with [specific population or in specific context] revealed [specific findings that add depth to the main book's arguments]. This scientific foundation provides readers with confidence that the practices recommended in the main book are not merely anecdotal but are supported by rigorous empirical research.)"

MANDATORY QUALITY REQUIREMENTS:
✓ 12-15 main sections (not 8-12)
✓ 3-5 subsections per section (not 2-4)
✓ 4-6 paragraphs per subsection (each 3-5 sentences)
✓ 2-3 Jots notes per subsection (150-250 words each)
✓ 15-20 external book citations (specific titles with authors)
✓ Author credentials for EVERY citation (detailed, not generic)
✓ Concrete examples and specific strategies in every note
✓ 3-4 paragraph introduction (400-500 words)
✓ 5-6 paragraph one-page summary (600-800 words)
✓ Total length: 10-14 pages (8,000-12,000 words)

Generate the complete, comprehensive JSON summary now. DO NOT abbreviate or summarize—provide FULL detailed content for every section and subsection.`;
}
