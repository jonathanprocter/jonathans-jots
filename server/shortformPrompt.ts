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

  return `You are creating a premium Jonathan's Jots-style book summary. Jonathan's Jots summaries are NOT just book summaries - they are ENHANCED with external research, comparative analysis, and additional expert perspectives.

**CRITICAL: YOUR CORE MISSION**

For every major concept in the book, you MUST:
1. Find 2-3 related perspectives from OTHER books/authors
2. Add historical, biographical, or scientific context
3. Provide comparative analysis (agreements AND contradictions)
4. Include practical implementation from other sources
5. Cite specific books, authors, and their credentials

**SOURCE DOCUMENT**
${bookTitle ? `Book Title: ${bookTitle}\n` : ''}${bookAuthor ? `Author: ${bookAuthor}\n` : ''}
Text to summarize:
${extractedText.substring(0, 15000)} ${extractedText.length > 15000 ? '...[truncated for processing]' : ''}

**RESEARCH CATEGORIES TO INCLUDE**

### Category 1: Comparative Book Analysis
When the book discusses concept X, find:
- Other authors who support this idea (with specific book titles)
- Other authors who contradict this idea
- How different traditions approach the same concept

Example template:
"Jonathan's Jots note: In *[Book Title]*, [Author Name] [agrees/contradicts/expands on] this idea by [specific explanation]. [Author] suggests [specific actionable advice]."

### Category 2: Expert Credentials & Context
When mentioning a person/expert:
- Who are they? (credentials, background)
- Why does their perspective matter?
- What's their most relevant work?

Example template:
"(Jonathan's Jots note: [Person Name], [credentials/background], is known for [achievement]. Their work in [area] provides important context because [reason].)"

### Category 3: Philosophical/Scientific Foundations
When the book makes a claim, explain:
- The underlying philosophy (Buddhism, Stoicism, etc.)
- The scientific research backing it
- Historical origins of the concept

Example template:
"Jonathan's Jots note: [Philosophy/Science] makes the distinction between [concept]. This is supported by [scientific research/historical tradition]. [Another expert] says [additional perspective]."

### Category 4: Critical Analysis
Don't just agree with the book - think critically:
- Where might this advice NOT apply?
- What are the limitations?
- How do other experts challenge this?

Example template:
"Jonathan's Jots note: Although [Author] recommends [X], some experts caution that [limitation]. In *[Book Title]*, [Author] argues [counterpoint]."

### Category 5: Practical Applications from Other Sources
When book gives abstract advice, add concrete steps from other sources:

Example template:
"In *[Book Title]*, [Author] offers practical strategies for implementing this:
● [Specific action step with explanation]
● [Another action step]
● [Third action step]"

**SOURCES YOU SHOULD REFERENCE**

Draw from these categories (use specific books and authors):
- Psychology: Tara Brach, Daniel Goleman, Carol Dweck, Tony Robbins
- Philosophy: Stoics (Marcus Aurelius, Epictetus), Buddhist teachers, Eckhart Tolle
- Self-help: James Clear, Ryan Holiday, Cal Newport, Greg McKeown, Mark Manson
- Spirituality: Deepak Chopra, Gary Zukav, Pema Chödrön, Jay Shetty
- Business: Clayton Christensen, Patrick Lencioni, Jim Collins
- Productivity: David Allen, Stephen Covey, Charles Duhigg

**OUTPUT STRUCTURE**

Generate a JSON response with the following structure:

{
  "bookTitle": "Extracted or provided book title",
  "bookAuthor": "Extracted or provided author name",
  "onePageSummary": "2-4 paragraph condensed overview with key principles as bullet points",
  "introduction": "2-3 paragraphs explaining the book's core premise and what readers will learn",
  "sections": [
    {
      "title": "Section title (e.g., 'Part 1: The Problem with Positive Thinking')",
      "content": [
        {
          "type": "paragraph",
          "text": "Main content paragraph explaining the book's ideas"
        },
        {
          "type": "jots_note",
          "noteType": "comparison | context | critique | practical | general",
          "sourceBook": "Book title if applicable",
          "sourceAuthor": "Author name if applicable",
          "text": "The Jonathan's Jots research note content with external insights"
        },
        {
          "type": "subsection",
          "title": "Subsection title",
          "content": "Subsection content"
        },
        {
          "type": "example",
          "text": "Concrete example illustrating the concept"
        },
        {
          "type": "list",
          "items": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
        }
      ]
    }
  ],
  "researchSources": [
    {
      "sourceType": "book | study | expert | philosophy",
      "bookTitle": "Referenced book title",
      "authorName": "Author name",
      "description": "Brief description of how this source was used"
    }
  ]
}

**FORMATTING RULES**

1. Book content = normal paragraphs
2. Jonathan's Jots additions = "Jonathan's Jots note:" callouts
3. Always cite specific books with italics notation: *Book Title*
4. Always name the author when referencing their work
5. Provide concrete, actionable details from other sources
6. Use bold for emphasis on key concepts: **bold text**
7. Include hyperlink-style references: [concept] or [book title]

**CRITICAL SUCCESS METRICS**

- Every major concept should have 1-2 Jonathan's Jots notes with external research
- Cite at least 5-10 different books/authors throughout the summary
- Include at least 2-3 instances of comparative analysis
- Add biographical context for 2-3 key figures mentioned
- Provide at least 3 actionable strategy lists from other sources
- Challenge or expand on the book's ideas at least 2-3 times

**QUALITY STANDARDS**

Remember: Readers pay for Jonathan's Jots because they get 10 books' worth of insights while reading 1 book summary. Every section should feel DENSE with cross-referenced wisdom.

- Make it comprehensive but readable
- Balance book content with external research
- Provide specific citations, not vague references
- Add genuine value through research, not just filler
- Create connections between different sources
- Think critically, don't just summarize

Now generate the complete Jonathan's Jots-style summary following this structure and methodology.`;
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
    
    // Count Jonathan's Jots notes
    let jotsNotesCount = 0;
    if (parsed.sections && Array.isArray(parsed.sections)) {
      parsed.sections.forEach((section: any) => {
        if (section.content && Array.isArray(section.content)) {
          jotsNotesCount += section.content.filter((item: any) => item.type === 'jots_note').length;
        }
      });
    }

    return {
      bookTitle: parsed.bookTitle || 'Untitled',
      bookAuthor: parsed.bookAuthor || 'Unknown Author',
      onePageSummary: parsed.onePageSummary || '',
      introduction: parsed.introduction || '',
      mainContent: JSON.stringify(parsed.sections || []),
      researchSources: parsed.researchSources || [],
      jotsNotesCount,
    };
  } catch (error) {
    // If parsing fails, return a basic structure
    console.error('Failed to parse AI response:', error);
    return {
      bookTitle: 'Untitled',
      bookAuthor: 'Unknown Author',
      onePageSummary: aiResponse.substring(0, 500),
      introduction: aiResponse.substring(0, 500),
      mainContent: JSON.stringify([{
        title: 'Summary',
        content: [{
          type: 'paragraph',
          text: aiResponse
        }]
      }]),
      researchSources: [],
      jotsNotesCount: 0,
    };
  }
}

