/**
 * Generate AI prompt for creating authentic Shortform-style summaries
 * CRITICAL: Must generate 10-14 PAGES of content to match real Shortform summaries
 */

export function generateShortformPrompt(documentText: string, bookTitle?: string, bookAuthor?: string): string {
  return `You are an expert research analyst creating a premium Jonathan's Jots summary that EXCEEDS Shortform quality standards.

🎯 CRITICAL REQUIREMENTS (ALL MANDATORY - NO SHORTCUTS):
• 12-15 main sections with 3-5 subsections each (MINIMUM 40-60 total subsections)
• 4-6 paragraphs per subsection (each paragraph 3-5 sentences, 60-80 words)
• 2-3 Jonathan's Jots notes per subsection (EXACTLY 150-250 words each, in gray boxes)
• 15-20 external book citations with COMPLETE author credentials (degrees, institutions, awards)
• All 5 note types distributed evenly: comparative, context, critique, practical, expert
• MINIMUM length: 8,000-12,000 words (10-14 pages) - LONGER IS BETTER
• MAXIMUM depth: Use your full 8,192 token output capacity
• COMPREHENSIVE coverage: Leave no important concept unexplored

DOCUMENT TO SUMMARIZE:
${documentText.slice(0, 50000)}

${bookTitle ? `BOOK TITLE: ${bookTitle}` : ''}
${bookAuthor ? `BOOK AUTHOR: ${bookAuthor}` : ''}

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
            },
            {
              "type": "context",
              "content": "150-250 words. MUST provide historical/biographical context with specific dates, events, and credentials."
            }
          ]
        },
        {
          "title": "Subsection 1.2: [Specific Topic]",
          "content": "4-6 paragraphs (500-700 words)...",
          "jotsNotes": [
            {
              "type": "critique",
              "content": "150-250 words. MUST cite research/expert challenging the idea with specific studies and findings."
            },
            {
              "type": "practical",
              "content": "150-250 words. MUST provide step-by-step actionable strategies with specific instructions."
            }
          ]
        },
        {
          "title": "Subsection 1.3: [Specific Topic]",
          "content": "4-6 paragraphs...",
          "jotsNotes": [
            {
              "type": "expert",
              "content": "150-250 words. MUST cite expert perspective with credentials and specific research findings."
            }
          ]
        }
        // 3-5 subsections per section
      ]
    },
    {
      "title": "Section 2: [Title]",
      "subsections": [/* same structure, 3-5 subsections */]
    },
    {
      "title": "Section 3: [Title]",
      "subsections": [/* same structure */]
    }
    // Continue to 12-15 sections total
  ],
  "researchSources": [
    {
      "title": "Thinking, Fast and Slow",
      "author": "Daniel Kahneman",
      "authorCredentials": "Nobel Prize-winning psychologist, professor emeritus at Princeton University, recipient of 2002 Nobel Memorial Prize in Economic Sciences",
      "relevance": "Expands on cognitive biases with System 1/System 2 framework. Provides evidence-based strategies for better decision-making."
    }
    // 15-20 sources total with FULL credentials
  ]
}

📝 JONATHAN'S JOTS NOTE REQUIREMENTS:

**Comparative (150-250 words):**
Compare with another book. Include: book title, author, credentials, specific comparison, concrete examples.

**Context (150-250 words):**
Provide background. Include: author bio, historical context, formative experiences, credentials, dates.

**Critique (150-250 words):**
Challenge the idea. Include: expert name, credentials, specific research, study results, alternative view.

**Practical (150-250 words):**
Actionable steps. Include: specific strategies, step-by-step instructions, tested results, metrics.

**Expert (150-250 words):**
Deep explanation. Include: expert name, credentials, research findings, scientific basis, specific studies.

✅ QUALITY CHECKLIST:
☑ 12-15 sections (count them)
☑ 3-5 subsections per section
☑ 4-6 paragraphs per subsection
☑ 2-3 notes per subsection
☑ Each note 150-250 words
☑ 15-20 research sources
☑ Full credentials for every citation
☑ All 5 note types used
☑ Total 8,000-12,000 words

⚠️ AVOID:
❌ Short paragraphs (under 3 sentences)
❌ Short notes (under 150 words)
❌ Generic credentials ("expert in field")
❌ Vague citations ("studies show")
❌ Fewer than 12 sections
❌ Fewer than 15 sources

CRITICAL: Return ONLY the JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Start your response with { and end with }. No preamble, no postamble, just pure JSON.

Generate the complete JSON summary now. Write FULL content for every section—do not abbreviate or summarize.`;

🚀 CLAUDE-SPECIFIC INSTRUCTIONS:
• You have 8,192 output tokens available - USE THEM ALL
• Your 200K context window allows you to maintain coherence across the entire summary
• Do NOT cut corners or truncate content before reaching the target length
• If you reach token limits, prioritize completing the current section fully
• Maintain consistent depth and quality throughout - no "summary fatigue"
• Your goal is to EXCEED what Shortform provides, not match it

⚡ REMEMBER: This is a premium service. Users expect comprehensive, deeply researched content that goes beyond typical summaries. Give them MORE than they expect.`;
}

