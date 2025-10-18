/**
 * Generate comprehensive Jonathan's Jots-style summary prompt based on extracted document text
 * This implements the deep research methodology that makes Jonathan's Jots summaries premium quality
 */

export interface JotsPromptConfig {
  extractedText: string;
  bookTitle?: string;
  bookAuthor?: string;
}

export function generateJotsPrompt(config: JotsPromptConfig): string {
  const { extractedText, bookTitle, bookAuthor } = config;

  return `You are creating a premium Jonathan's Jots-style book summary that EXACTLY matches the Shortform methodology.

**CRITICAL UNDERSTANDING: What Makes Shortform Different**

Shortform summaries are NOT just book summaries. They are RESEARCH REPORTS that:
1. Summarize the original book's content
2. Add 5-10 EXTERNAL book citations with comparative analysis
3. Include inline research notes: "(Shortform note: ...)" throughout the text
4. Provide expert credentials and biographical context
5. Offer critical analysis and alternative perspectives
6. Give practical implementations from other sources

**INLINE CITATION FORMAT (MANDATORY)**

Every 2-3 paragraphs MUST include an inline research note in this EXACT format:

"(Shortform note: [Author Name], [credentials], [agrees/contradicts/expands] in *[Book Title]* by [explanation]. [Author] suggests [specific advice/perspective].)"

Example from real Shortform:
"(Shortform note: Gary Chapman's *The 5 Love Languages* offers a complementary perspective on building appreciation. Chapman, a marriage counselor, identifies five primary ways people give and receive love: Words of Affirmation, Quality Time, Receiving Gifts, Acts of Service, and Physical Touch.)"

**SOURCE DOCUMENT**
${bookTitle ? `Book Title: ${bookTitle}\n` : ''}${bookAuthor ? `Author: ${bookAuthor}\n` : ''}
Text to summarize:
${extractedText.substring(0, 15000)} ${extractedText.length > 15000 ? '...[truncated for processing]' : ''}

**MANDATORY RESEARCH SOURCES (Must cite 8-12 books)**

For EVERY major concept, add inline notes citing these types of sources:
- **Psychology**: Daniel Goleman (*Emotional Intelligence*), Carol Dweck (*Mindset*), Tara Brach (*Radical Acceptance*)
- **Philosophy**: Marcus Aurelius (*Meditations*), Eckhart Tolle (*The Power of Now*), Pema Chödrön (*When Things Fall Apart*)
- **Self-improvement**: James Clear (*Atomic Habits*), Mark Manson (*The Subtle Art*), Ryan Holiday (*The Obstacle Is the Way*)
- **Productivity**: David Allen (*Getting Things Done*), Cal Newport (*Deep Work*), Greg McKeown (*Essentialism*)
- **Relationships**: John Gottman (*The Seven Principles*), Gary Chapman (*The 5 Love Languages*)
- **Business**: Patrick Lencioni, Jim Collins, Clayton Christensen
- **Spirituality**: Jay Shetty, Deepak Chopra, Gary Zukav

**OUTPUT STRUCTURE**

Generate a JSON response with this EXACT structure:

{
  "bookTitle": "Extracted or provided book title",
  "bookAuthor": "Extracted or provided author name",
  "onePageSummary": "3-5 paragraph comprehensive overview with key principles and unique contributions. Include inline Shortform notes here too.",
  "introduction": "3-5 paragraphs with author background, book context, central thesis. Include at least 1-2 inline Shortform notes about the author or related works.",
  "sections": [
    {
      "title": "Chapter/Section Title",
      "content": [
        {
          "type": "paragraph",
          "text": "Main content paragraph explaining the book's ideas. (Shortform note: Add inline research citation here with specific book title, author credentials, and how it relates.)"
        },
        {
          "type": "paragraph",
          "text": "Another paragraph with more book content and analysis. (Shortform note: Another inline citation from a different source, offering comparative perspective or practical application.)"
        },
        {
          "type": "subsection",
          "title": "Subsection Title",
          "content": "Subsection content with inline notes. (Shortform note: Expert perspective from another book.)"
        },
        {
          "type": "list",
          "items": [
            "**Key Point 1**: Explanation",
            "**Key Point 2**: Explanation",
            "**Key Point 3**: Explanation"
          ]
        }
      ]
    }
  ],
  "researchSources": [
    {
      "sourceType": "book",
      "bookTitle": "Referenced book title",
      "authorName": "Author name with credentials",
      "description": "How this source was used in the summary (e.g., 'Provided comparative perspective on meditation practices')"
    }
  ]
}

**CRITICAL FORMATTING RULES**

1. **Inline notes ONLY** - Do NOT create separate callout boxes
2. **Format**: "(Shortform note: ...)" - must start with this exact phrase
3. **Cite specific books**: Use italics notation *Book Title*
4. **Name authors with credentials**: "Daniel Goleman, a science journalist and psychologist"
5. **Bold key concepts**: **important term**
6. **Every 2-3 paragraphs** must have an inline Shortform note
7. **Minimum 15-20 inline notes** throughout the entire summary
8. **8-12 different books cited** in research sources

**CONTENT REQUIREMENTS**

- 8-12 comprehensive sections covering the book
- Each section has 3-5 paragraphs minimum
- Every major concept gets comparative analysis from other books
- Include author credentials when first mentioning them
- Add historical/philosophical context where relevant
- Provide critical analysis (not just agreement)
- Include practical implementations from other sources
- Make connections between different sources

**EXAMPLE OF PERFECT INLINE NOTE**

"The antidote to stonewalling is to take a self-soothing break for at least 20 minutes and then re-engage when calmer. (Shortform note: Tara Brach, a clinical psychologist and meditation teacher, offers powerful tools for self-soothing in *Radical Acceptance*. Her RAIN meditation practice—Recognize, Allow, Investigate, Nurture—can be adapted for self-soothing breaks, helping individuals process intense emotions and facilitating a calmer return to dialogue.)"

**QUALITY CHECKLIST**

Before submitting, verify:
✓ 15-20 inline "(Shortform note: ...)" citations throughout
✓ 8-12 different books cited in researchSources
✓ Author credentials provided for each expert
✓ Comparative analysis (agreements AND contradictions)
✓ Practical applications from other sources
✓ Critical thinking (not just summarizing)
✓ Rich, dense content with cross-referenced wisdom
✓ Specific book titles in italics: *Book Title*
✓ Bold formatting for key concepts: **concept**

Now generate the complete Jonathan's Jots-style summary with inline research notes throughout.`;
}

/**
 * Parse the AI response and extract structured summary data
 */
export interface ParsedSummaryResponse {
  bookTitle: string;
  bookAuthor: string;
  onePageSummary: string;
  introduction: string;
  mainContent: string; // JSON stringified sections array
  researchSources: Array<{
    sourceType: 'book' | 'study' | 'expert' | 'philosophy';
    bookTitle?: string;
    authorName?: string;
    description?: string;
  }>;
  jotsNotesCount: number;
}

export function parseSummaryResponse(aiResponse: string): ParsedSummaryResponse {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(aiResponse);
    
    // Count Shortform notes by searching for "(Shortform note:" in all text content
    let jotsNotesCount = 0;
    const countNotesInText = (text: string) => {
      const matches = text.match(/\(Shortform note:/gi);
      return matches ? matches.length : 0;
    };
    
    // Count in onePageSummary
    if (parsed.onePageSummary) {
      jotsNotesCount += countNotesInText(parsed.onePageSummary);
    }
    
    // Count in introduction
    if (parsed.introduction) {
      jotsNotesCount += countNotesInText(parsed.introduction);
    }
    
    // Count in sections
    if (parsed.sections && Array.isArray(parsed.sections)) {
      parsed.sections.forEach((section: any) => {
        if (section.content && Array.isArray(section.content)) {
          section.content.forEach((item: any) => {
            if (item.type === 'paragraph' && item.text) {
              jotsNotesCount += countNotesInText(item.text);
            }
            if (item.type === 'subsection' && item.content) {
              jotsNotesCount += countNotesInText(item.content);
            }
          });
        }
      });
    }
    
    return {
      bookTitle: parsed.bookTitle || 'Unknown Title',
      bookAuthor: parsed.bookAuthor || 'Unknown Author',
      onePageSummary: parsed.onePageSummary || '',
      introduction: parsed.introduction || '',
      mainContent: JSON.stringify(parsed.sections || []),
      researchSources: parsed.researchSources || [],
      jotsNotesCount,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Invalid AI response format');
  }
}

