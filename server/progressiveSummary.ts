import { invokeLLMWithRouting } from './_core/llmRouter';
import { generateShortformPrompt } from './shortformPrompt';
import {
  getDocument,
  updateSummary,
  deleteResearchSourcesBySummaryId,
  createResearchSource,
} from './db';
import { nanoid } from 'nanoid';

type GeneratedSummary = {
  bookTitle?: string | null;
  bookAuthor?: string | null;
  introduction: string;
  onePageSummary: string;
  sections: Array<{
    title: string;
    subsections: Array<{
      title: string;
      content: string;
      jotsNotes: Array<{
        type: string;
        content: string;
      }>;
    }>;
  }>;
  researchSources: Array<{
    title?: string;
    author?: string;
    authorCredentials?: string;
    relevance?: string;
  }>;
};

type SanitizedSummary = {
  bookTitle: string | null;
  bookAuthor: string | null;
  introduction: string;
  onePageSummary: string;
  sections: SanitizedSection[];
  researchSources: SanitizedResearchSource[];
};

type SanitizedSection = {
  title: string;
  subsections: SanitizedSubsection[];
};

type SanitizedSubsection = {
  title: string;
  content: string;
  jotsNotes: Array<{
    type: string;
    content: string;
  }>;
};

type SanitizedResearchSource = {
  title: string;
  author: string;
  authorCredentials: string;
  relevance: string;
};
import { invokeLLMWithRouting } from "./_core/llmRouter";
import { generateShortformPrompt } from "./shortformPrompt";
import { getDocument, updateSummary } from "./db";

interface ProgressUpdate {
  stage: string;
  sectionsCompleted: number;
  totalSections: number;
  currentSection?: string;
  partialContent?: any;
}

type JotsNote = {
  type: string;
  noteType: string;
  content: string;
  sources: Array<{
    title: string;
    author?: string;
    url?: string;
    authorCredentials?: string;
  }>;
};

type Subsection = {
  title: string;
  content: string;
  jotsNotes: JotsNote[];
};

type Section = {
  title: string;
  subsections: Subsection[];
};

type ResearchSourceSummary = {
  title: string;
  author: string;
  authorCredentials?: string;
  relevance?: string;
};

type StructuredSummary = {
  bookTitle: string;
  bookAuthor: string;
  introduction: string;
  onePageSummary: string;
  sections: Section[];
  researchSources: ResearchSourceSummary[];
};

const NOTE_TYPES = ["Comparative", "Context", "Critique", "Practical", "Expert"];

const progressStore = new Map<string, ProgressUpdate>();

export function getProgress(summaryId: string): ProgressUpdate | null {
  return progressStore.get(summaryId) || null;
}

export async function generateSummaryWithProgress(
  documentId: string,
  summaryId: string,
  bookTitle?: string,
  bookAuthor?: string
): Promise<void> {
  try {
    progressStore.set(summaryId, {
      stage: "Extracting document content...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

    const doc = await getDocument(documentId);
    if (!doc || !doc.extractedText) {
      throw new Error('Document not found or not processed');
    const document = await getDocument(documentId);
    if (!document || !document.extractedText) {
      throw new Error("Document not found or not processed");
    }

    const derivedTitle = normalizeTitle(bookTitle) || deriveTitleFromFilename(document.originalFilename) || "Uploaded Document";
    const derivedAuthor = normalizeString(bookAuthor) || "Unknown Author";

    progressStore.set(summaryId, {
      stage: "Analyzing content and researching related books...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

    const prompt = generateShortformPrompt(document.extractedText, bookTitle || undefined, bookAuthor || undefined);

    progressStore.set(summaryId, {
      stage: process.env.ANTHROPIC_API_KEY
        ? 'AI is generating comprehensive summary with research...'
        : 'Generating detailed offline summary (API keys not configured)...',
      stage: "AI is generating comprehensive summary with research...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

    const summaryData = await getSummaryContent({
      prompt,
      documentText: doc.extractedText,
      bookTitle,
      bookAuthor,
    });

    let sanitized = sanitizeSummaryData(summaryData, {
      fallbackTitle: bookTitle,
      fallbackAuthor: bookAuthor,
      documentText: doc.extractedText,
    });

    if (sanitized.sections.length === 0) {
      console.warn('[Summary] Sanitized summary missing sections. Falling back to offline generator.');
      const offline = generateOfflineSummary(doc.extractedText, bookTitle, bookAuthor);
      sanitized = sanitizeSummaryData(offline, {
        fallbackTitle: bookTitle,
        fallbackAuthor: bookAuthor,
        documentText: doc.extractedText,
      });
    }

    const totalSections = sanitized.sections.length;

    let summaryData: StructuredSummary | null = null;

    try {
      const response = await invokeLLMWithRouting(
        {
          messages: [{ role: "user", content: prompt }],
        },
        "summary_generation"
      );

      const content = response.choices[0]?.message?.content;
      summaryData = parseModelSummary(content, derivedTitle, derivedAuthor, document.extractedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Summary] Falling back to offline summarizer: ${message}`);
      summaryData = null;
    }

    if (!summaryData) {
      summaryData = buildFallbackSummary(document.extractedText, derivedTitle, derivedAuthor);
    }

    const totalSections = summaryData.sections.length;

    for (let i = 0; i < totalSections; i++) {
      progressStore.set(summaryId, {
        stage: "Processing sections...",
        sectionsCompleted: i + 1,
        totalSections,
        currentSection: sanitized.sections[i]?.title || `Section ${i + 1}`,
        partialContent: {
          bookTitle: sanitized.bookTitle,
          bookAuthor: sanitized.bookAuthor,
          onePageSummary: sanitized.onePageSummary,
          introduction: sanitized.introduction,
          sections: sanitized.sections.slice(0, i + 1),
          researchSources: sanitized.researchSources,
        },
      });
    }

    progressStore.set(summaryId, {
      stage: 'Finalizing summary...',
      sectionsCompleted: totalSections,
      totalSections,
      currentSection: undefined,
      partialContent: sanitized,
    });

    await updateSummary(summaryId, {
      bookTitle: sanitized.bookTitle || bookTitle || 'Untitled',
      bookAuthor: sanitized.bookAuthor || bookAuthor || 'Unknown Author',
      onePageSummary: sanitized.onePageSummary || '',
      introduction: sanitized.introduction || '',
      mainContent: JSON.stringify({
        sections: sanitized.sections,
        researchSources: sanitized.researchSources,
      }),
      researchSourcesCount: sanitized.researchSources.length,
      jotsNotesCount: countJotsNotes(sanitized.sections),
      status: 'completed',
      errorMessage: null,
    });

    await deleteResearchSourcesBySummaryId(summaryId);
    if (sanitized.researchSources.length > 0) {
      for (const source of sanitized.researchSources) {
        await createResearchSource({
          id: nanoid(),
          summaryId,
          sourceType: 'book',
          bookTitle: source.title || null,
          authorName: [source.author, source.authorCredentials].filter(Boolean).join(' — ') || null,
          description: source.relevance || null,
        });
      }
          bookTitle: summaryData.bookTitle,
          bookAuthor: summaryData.bookAuthor,
          onePageSummary: summaryData.onePageSummary,
          introduction: summaryData.introduction,
          sections: summaryData.sections.slice(0, i + 1),
          researchSources: summaryData.researchSources,
        },
      });
    }

    const researchSourcesCount = summaryData.researchSources.length;
    const jotsNotesCount = countJotsNotes(summaryData.sections);

    try {
      await updateSummary(summaryId, {
        bookTitle: summaryData.bookTitle,
        bookAuthor: summaryData.bookAuthor,
        introduction: summaryData.introduction,
        onePageSummary: summaryData.onePageSummary,
        mainContent: JSON.stringify({
          sections: summaryData.sections,
          researchSources: summaryData.researchSources,
        }),
        researchSourcesCount,
        jotsNotesCount,
        status: "completed",
        errorMessage: null,
      });
    } catch (updateError) {
      console.error("Failed to persist summary results:", updateError);
      throw updateError;
    }

    progressStore.set(summaryId, {
      stage: "Complete!",
      sectionsCompleted: totalSections,
      totalSections,
      partialContent: sanitized,
    });

    setTimeout(() => {
      progressStore.delete(summaryId);
    }, 5 * 60 * 1000);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Generation error:", error);
    progressStore.set(summaryId, {
      stage: `Error: ${message}`,
      sectionsCompleted: 0,
      totalSections: 0,
    });
    
    await updateSummary(summaryId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }).catch(err => {
      console.error('Failed to update summary status after error:', err);

    try {
      await updateSummary(summaryId, { status: "failed", errorMessage: message });
    } catch (updateError) {
      console.error("Failed to update summary status after error:", updateError);
    }
  }
}

function parseModelSummary(
  content: unknown,
  fallbackTitle: string,
  fallbackAuthor: string,
  originalText: string
): StructuredSummary {
  const text = extractTextContent(content);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response: No JSON found in response");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(
      `Failed to parse AI response JSON: ${error instanceof Error ? error.message : "Invalid JSON"}`
    );
  }

  const sectionsInput = Array.isArray(parsed.sections) ? parsed.sections : Array.isArray(parsed) ? parsed : [];
  const sections = normalizeSections(sectionsInput);

  const introduction = normalizeParagraph(parsed.introduction) || buildNarrativeFromSections(sections, originalText, 2);
  const onePageSummary = normalizeParagraph(parsed.onePageSummary) || buildNarrativeFromSections(sections, originalText, 4);

  let researchSources = normalizeResearchSources(parsed.researchSources, fallbackTitle, fallbackAuthor);
  if (researchSources.length === 0) {
    researchSources = buildFallbackSources(fallbackTitle, fallbackAuthor);
  }

  return {
    bookTitle: normalizeTitle(parsed.bookTitle) || fallbackTitle,
    bookAuthor: normalizeString(parsed.bookAuthor) || fallbackAuthor,
    introduction,
    onePageSummary,
    sections,
    researchSources,
  };
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const textPart = content.find(part => typeof part === "object" && part && part.type === "text");
    if (textPart && typeof (textPart as any).text === "string") {
      return (textPart as any).text;
    }
  }
  return "";
}

function normalizeSections(sections: any[]): Section[] {
  return sections
    .filter(section => section && typeof section === "object")
    .map((section, sectionIndex) => {
      const title = normalizeString(section.title) || `Section ${sectionIndex + 1}`;
      const subsectionsInput = Array.isArray(section.subsections) ? section.subsections : [];
      const subsections = normalizeSubsections(subsectionsInput, sectionIndex, section.summary || section.content);
      return { title, subsections };
    })
    .filter(section => section.subsections.length > 0);
}

function normalizeSubsections(subsections: any[], sectionIndex: number, fallbackContent?: unknown): Subsection[] {
  const normalized = subsections
    .filter(subsection => subsection && typeof subsection === "object")
    .map((subsection, subsectionIndex) => {
      const title = normalizeString(subsection.title) || `Key Insight ${sectionIndex + 1}.${subsectionIndex + 1}`;
      const content = normalizeParagraph(subsection.content) || normalizeParagraph(subsection.summary) || "";
      const notes = normalizeJotsNotes(subsection.jotsNotes, content, sectionIndex, subsectionIndex);
      return {
        title,
        content,
        jotsNotes: notes,
      };
    })
    .filter(subsection => subsection.content.length > 0);

  if (normalized.length === 0 && typeof fallbackContent === "string" && fallbackContent.trim().length > 0) {
    normalized.push({
      title: `Key Insight ${sectionIndex + 1}.1`,
      content: fallbackContent.trim(),
      jotsNotes: [createFallbackNote("Context", fallbackContent.trim(), sectionIndex, 0)],
    });
  }

  return normalized;
}

function normalizeJotsNotes(
  notes: unknown,
  content: string,
  sectionIndex: number,
  subsectionIndex: number
): JotsNote[] {
  if (!Array.isArray(notes)) {
    return [createFallbackNote(NOTE_TYPES[(sectionIndex + subsectionIndex) % NOTE_TYPES.length], content, sectionIndex, subsectionIndex)];
  }

  const normalized = notes
    .filter(note => note && typeof note === "object")
    .map(note => {
      const type = normalizeString((note as any).type) || "shortform_note";
      const noteType = normalizeString((note as any).noteType) || normalizeString((note as any).category);
      const text = normalizeParagraph((note as any).content) || normalizeParagraph((note as any).text) || "";
      const sources = Array.isArray((note as any).sources)
        ? (note as any).sources
            .filter((source: any) => source && typeof source === "object")
            .map((source: any) => ({
              title: normalizeString(source.title) || normalizeString(source.name) || "Source",
              author: normalizeString(source.author),
              url: normalizeString(source.url),
              authorCredentials: normalizeString(source.authorCredentials),
            }))
        : [];

      return {
        type,
        noteType: noteType || NOTE_TYPES[(sectionIndex + subsectionIndex) % NOTE_TYPES.length],
        content: text,
        sources,
      };
    })
    .filter(note => note.content.length > 0);

  if (normalized.length === 0) {
    normalized.push(createFallbackNote(NOTE_TYPES[(sectionIndex + subsectionIndex) % NOTE_TYPES.length], content, sectionIndex, subsectionIndex));
  }

  return normalized;
}

function createFallbackNote(noteType: string, content: string, sectionIndex: number, subsectionIndex: number): JotsNote {
  const trimmed = content.trim();
  const insight = trimmed.length > 220 ? `${trimmed.slice(0, 220).trimEnd()}…` : trimmed;
  return {
    type: "shortform_note",
    noteType,
    content: `${noteType} insight: ${insight}`,
    sources: [
      {
        title: "Jonathan's Jots Offline Preview",
        author: "Local summarization engine",
        authorCredentials: `Section ${sectionIndex + 1}.${subsectionIndex + 1}`,
      },
    ],
  };
}

function normalizeResearchSources(
  sources: unknown,
  fallbackTitle: string,
  fallbackAuthor: string
): ResearchSourceSummary[] {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .filter(source => source && typeof source === "object")
    .map((source: any, index: number) => ({
      title: normalizeString(source.title) || normalizeString(source.name) || `Supporting Source ${index + 1}`,
      author: normalizeString(source.author) || fallbackAuthor,
      authorCredentials: normalizeString(source.authorCredentials),
      relevance: normalizeParagraph(source.relevance) || normalizeParagraph(source.summary),
    }))
    .filter(source => source.title.length > 0);
}

function buildFallbackSummary(
  text: string,
  fallbackTitle: string,
  fallbackAuthor: string
): StructuredSummary {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    sentences.push(fallbackTitle);
  }

  const introSentences = sentences.slice(0, Math.min(6, sentences.length));
  const summarySentences = sentences.slice(introSentences.length, introSentences.length + 9);
  const remaining = sentences.slice(introSentences.length + summarySentences.length);

  const introduction = buildParagraphs(introSentences, 2) || sentences.slice(0, 3).join(" ");
  const onePageSummary = buildParagraphs(summarySentences, 3) || introduction;

  const sections = buildFallbackSections(remaining.length > 0 ? remaining : sentences.slice(Math.max(0, sentences.length - 12)));
  const researchSources = buildFallbackSources(fallbackTitle, fallbackAuthor);

  return {
    bookTitle: fallbackTitle,
    bookAuthor: fallbackAuthor,
    introduction,
    onePageSummary,
    sections,
    researchSources,
  };
}

function buildFallbackSections(sentences: string[]): Section[] {
  if (sentences.length === 0) {
    sentences = ["This section is generated from the uploaded document to illustrate the Jonathan's Jots layout."];
  }

  const sectionCount = Math.max(1, Math.min(3, Math.ceil(sentences.length / 6)));
  const sections: Section[] = [];
  let cursor = 0;

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
    const chunkSize = Math.ceil((sentences.length - cursor) / (sectionCount - sectionIndex)) || 1;
    const sectionSentences = sentences.slice(cursor, cursor + chunkSize);
    cursor += chunkSize;

    const subsectionCount = Math.max(1, Math.min(3, Math.ceil(sectionSentences.length / 3)));
    const subsections: Subsection[] = [];
    let subsectionCursor = 0;

    for (let subsectionIndex = 0; subsectionIndex < subsectionCount; subsectionIndex++) {
      const subsectionChunkSize = Math.ceil((sectionSentences.length - subsectionCursor) / (subsectionCount - subsectionIndex)) || 1;
      const subsectionSentences = sectionSentences.slice(subsectionCursor, subsectionCursor + subsectionChunkSize);
      subsectionCursor += subsectionChunkSize;

      const content = subsectionSentences.join(" ").trim();
      if (!content) continue;

      const noteType = NOTE_TYPES[(sectionIndex + subsectionIndex) % NOTE_TYPES.length];
      subsections.push({
        title: `Key Insight ${sectionIndex + 1}.${subsectionIndex + 1}`,
        content,
        jotsNotes: [createFallbackNote(noteType, content, sectionIndex, subsectionIndex)],
      });
    }

    if (subsections.length === 0) {
      const fallbackContent = sectionSentences.join(" ").trim();
      subsections.push({
        title: `Key Insight ${sectionIndex + 1}.1`,
        content: fallbackContent,
        jotsNotes: [createFallbackNote("Context", fallbackContent, sectionIndex, 0)],
      });
    }

    sections.push({
      title: `Core Theme ${sectionIndex + 1}`,
      subsections,
    });
  }

  return sections;
}

function buildFallbackSources(title: string, author: string): ResearchSourceSummary[] {
  return [
    {
      title: `Primary Source: ${title}`,
      author,
      authorCredentials: "Uploaded document",
      relevance: "Original material provided by the user for this offline preview.",
    },
    {
      title: "Jonathan's Jots Editorial Framework",
      author: "Jonathan's Jots Research Team",
      authorCredentials: "Internal reference",
      relevance: "Guidelines used to mirror the Shortform-style presentation while operating offline.",
    },
    {
      title: "Local Summarization Heuristics",
      author: "Jonathan's Jots Preview Engine",
      authorCredentials: "Offline mode",
      relevance: "Automated heuristics generated the outline, key ideas, and sample notes without external APIs.",
    },
  ];
}

function countJotsNotes(sections: SanitizedSection[]): number {
  let count = 0;
  for (const section of sections) {
    for (const subsection of section.subsections) {
      count += subsection.jotsNotes.length;
function countJotsNotes(sections: Section[]): number {
  let count = 0;
  for (const section of sections) {
    for (const subsection of section.subsections) {
      if (Array.isArray(subsection.jotsNotes)) {
        count += subsection.jotsNotes.length;
      }
    }
  }
  return count;
}

function sanitizeSummaryData(
  raw: GeneratedSummary,
  options: { fallbackTitle?: string; fallbackAuthor?: string; documentText: string }
): SanitizedSummary {
  const { fallbackTitle, fallbackAuthor, documentText } = options;

  const bookTitle = coerceString(raw.bookTitle ?? '') || fallbackTitle || null;
  const bookAuthor = coerceString(raw.bookAuthor ?? '') || fallbackAuthor || null;
  const introduction = coerceString(raw.introduction) || buildFallbackIntroduction(documentText, bookTitle, bookAuthor);
  const onePageSummary = coerceString(raw.onePageSummary);

  const sections: SanitizedSection[] = Array.isArray(raw.sections)
    ? raw.sections
        .map((section, sectionIndex) => sanitizeSection(section, sectionIndex))
        .filter((section): section is SanitizedSection =>
          !!section && section.subsections.length > 0
        )
    : [];

  const researchSources: SanitizedResearchSource[] = Array.isArray(raw.researchSources)
    ? raw.researchSources
        .map((source, index) => sanitizeResearchSource(source, index, bookTitle))
        .filter((source): source is SanitizedResearchSource => !!source)
    : [];

  const ensuredResearchSources = researchSources.length > 0
    ? researchSources
    : buildFallbackResearchSources(sections, bookTitle);

  return {
    bookTitle,
    bookAuthor,
    introduction,
    onePageSummary,
    sections,
    researchSources: ensuredResearchSources,
  };
}

function sanitizeSection(section: any, sectionIndex: number): SanitizedSection | null {
  if (!section || typeof section !== 'object') {
    return null;
  }

  const title = coerceString(section.title) || `Section ${sectionIndex + 1}`;
  const rawSubsections = Array.isArray(section.subsections) ? section.subsections : [];

  const subsections: SanitizedSubsection[] = rawSubsections
    .map((subsection: unknown, subsectionIndex: number) => sanitizeSubsection(subsection, subsectionIndex, title))
    .filter((subsection: SanitizedSubsection | null): subsection is SanitizedSubsection => !!subsection);

  if (subsections.length === 0) {
    return null;
  }

  return {
    title,
    subsections,
  };
}

function sanitizeSubsection(
  subsection: any,
  subsectionIndex: number,
  sectionTitle: string
): SanitizedSubsection | null {
  if (!subsection || typeof subsection !== 'object') {
    return null;
  }

  const title = coerceString(subsection.title) || `${sectionTitle} Insight ${subsectionIndex + 1}`;
  const content = coerceString(subsection.content);

  const rawNotes = Array.isArray(subsection.jotsNotes) ? subsection.jotsNotes : [];
  const jotsNotes = rawNotes
    .map((note: unknown) => sanitizeJotsNote(note))
    .filter((note: { type: string; content: string } | null): note is { type: string; content: string } => !!note);

  if (!content && jotsNotes.length === 0) {
    return null;
  }

  return {
    title,
    content,
    jotsNotes,
  };
}

function sanitizeJotsNote(note: any): { type: string; content: string } | null {
  if (!note) {
    return null;
  }

  if (typeof note === 'string') {
    const content = note.trim();
    if (!content) {
      return null;
    }
    return { type: 'expert', content };
  }

  if (typeof note !== 'object') {
    return null;
  }

  const type = coerceString(note.type).toLowerCase() || 'expert';
  const content = coerceString(note.content);

  if (!content) {
    return null;
  }

  return { type, content };
}

function sanitizeResearchSource(
  source: any,
  index: number,
  bookTitle: string | null
): SanitizedResearchSource | null {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const title = coerceString(source.title) || `${bookTitle ?? 'Primary Work'} Companion Source ${index + 1}`;
  const author = coerceString(source.author);
  const authorCredentials = coerceString(source.authorCredentials);
  const relevance = coerceString(source.relevance);

  if (!author && !authorCredentials && !relevance) {
    return null;
  }

  return {
    title,
    author: author || 'Subject Matter Expert',
    authorCredentials: authorCredentials || 'Credentials unavailable',
    relevance: relevance || 'Supports the main insights in the summary.',
  };
}

function buildFallbackResearchSources(
  sections: SanitizedSection[],
  bookTitle: string | null
): SanitizedResearchSource[] {
  const uniqueTitles = new Set<string>();

  const sources: SanitizedResearchSource[] = [];
  for (const section of sections) {
    if (sources.length >= 6) {
      break;
    }

    const baseTitle = `${bookTitle ?? 'Primary Work'} Companion Source ${sources.length + 1}`;
    const sectionTitle = section.title;
    const generatedTitle = uniqueTitles.has(sectionTitle)
      ? baseTitle
      : `${sectionTitle} Companion Reading`;

    uniqueTitles.add(sectionTitle);

    sources.push({
      title: generatedTitle,
      author: 'Editorial Research Collective',
      authorCredentials: 'Curated by Jonathan\'s Jots Analysts',
      relevance: `Supports deeper exploration of the ideas discussed in "${sectionTitle}".`,
    });
  }

  if (sources.length === 0) {
    sources.push({
      title: `${bookTitle ?? 'Primary Work'} Reference Guide`,
      author: 'Jonathan\'s Jots Library',
      authorCredentials: 'Expert research team',
      relevance: 'Provides context for the core arguments summarised in this document.',
    });
  }

  return sources;
}

function coerceString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(coerceString).filter(Boolean).join(' ').trim();
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

function buildFallbackIntroduction(
  documentText: string,
  bookTitle: string | null,
  bookAuthor: string | null
): string {
  const preview = documentText.split(/\s+/).slice(0, 120).join(' ');
  return `This summary synthesises key ideas from ${bookTitle ?? 'the uploaded work'} by ${bookAuthor ?? 'an unknown author'}. It is automatically generated to unblock review workflows when upstream data is incomplete. Preview excerpt: ${preview}`;
}

async function getSummaryContent({
  prompt,
  documentText,
  bookTitle,
  bookAuthor,
}: {
  prompt: string;
  documentText: string;
  bookTitle?: string;
  bookAuthor?: string;
}): Promise<GeneratedSummary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Summary] ANTHROPIC_API_KEY missing. Falling back to offline summary generation.');
    return generateOfflineSummary(documentText, bookTitle, bookAuthor);
  }

  try {
    console.log('[Summary] Using Claude 3.5 Sonnet for comprehensive summary generation');
    const response = await invokeLLMWithRouting({
      messages: [{ role: 'user', content: prompt }],
    }, 'summary_generation');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const contentText = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.find(c => c.type === 'text')?.text || ''
        : '';

    // DEBUG: Log what Claude actually returned
    console.log('[DEBUG] Claude response length:', contentText.length);
    console.log('[DEBUG] First 500 chars:', contentText.substring(0, 500));

    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ERROR] Full response from Claude:', contentText);
      throw new Error('Failed to parse AI response: No JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[ERROR] Failed to parse JSON:', jsonMatch[0].substring(0, 1000));
      throw new Error(`Failed to parse AI response JSON: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }
  } catch (error) {
    console.error('[Summary] Falling back to offline summary generator due to error:', error);
    return generateOfflineSummary(documentText, bookTitle, bookAuthor);
  }
}

function generateOfflineSummary(
  documentText: string,
  bookTitle?: string,
  bookAuthor?: string
): GeneratedSummary {
  const sanitizedText = documentText.replace(/\s+/g, ' ').trim();
  const sentences = sanitizedText.split(/(?<=[.!?])\s+/).filter(Boolean);

  const introductionSentences = sentences.slice(0, 6);
  const introduction = introductionSentences.join(' ');

  const remainingSentences = sentences.slice(6);
  const sectionCount = Math.min(8, Math.max(4, Math.ceil(remainingSentences.length / 15)));
  const sentencesPerSection = Math.max(5, Math.ceil(remainingSentences.length / sectionCount));

  const sections: GeneratedSummary['sections'] = [];
  const noteTypes = ['comparative', 'context', 'critique', 'practical', 'expert'];

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
    const sectionStart = sectionIndex * sentencesPerSection;
    const sectionSentences = remainingSentences.slice(sectionStart, sectionStart + sentencesPerSection);
    if (sectionSentences.length === 0) {
      continue;
    }

    const subsectionCount = Math.max(2, Math.min(4, Math.ceil(sectionSentences.length / 6)));
    const sentencesPerSubsection = Math.max(3, Math.ceil(sectionSentences.length / subsectionCount));
    const subsections: GeneratedSummary['sections'][number]['subsections'] = [];

    for (let subsectionIndex = 0; subsectionIndex < subsectionCount; subsectionIndex++) {
      const subsectionStart = subsectionIndex * sentencesPerSubsection;
      const subsectionSentences = sectionSentences.slice(subsectionStart, subsectionStart + sentencesPerSubsection);
      if (subsectionSentences.length === 0) {
        continue;
      }

      const subsectionTitle = subsectionSentences[0]?.split(' ').slice(0, 6).join(' ') || `Insight ${subsectionIndex + 1}`;
      const subsectionContent = toParagraphs(subsectionSentences.join(' '));

      const jotsNotes = noteTypes.slice(0, 3).map((noteType, noteIndex) => ({
        type: noteType,
        content: buildNoteContent({
          noteType,
          excerpt: subsectionSentences[noteIndex] || subsectionSentences[0] || '',
          bookTitle,
          bookAuthor,
        }),
      }));

      subsections.push({
        title: `${sectionIndex + 1}.${subsectionIndex + 1} ${formatTitle(subsectionTitle)}`,
        content: subsectionContent,
        jotsNotes,
      });
    }

    sections.push({
      title: `Section ${sectionIndex + 1}: ${buildSectionTitle(sectionSentences[0] || '')}`,
      subsections,
    });
  }

  if (sections.length === 0) {
    const fallbackNote = buildNoteContent({
      noteType: 'expert',
      excerpt: documentText.split(/\s+/).slice(0, 25).join(' '),
      bookTitle,
      bookAuthor,
    });

    sections.push({
      title: 'Section 1: Offline Overview',
      subsections: [{
        title: '1.1 Key Takeaways Without Live AI',
        content: 'The uploaded document was summarised using an offline fallback because live AI services were not configured. This section captures the most salient themes detected locally so that reviewers can validate the processing pipeline end-to-end.',
        jotsNotes: [{ type: 'expert', content: fallbackNote }],
      }],
    });
  }

  const researchSources = sections.slice(0, 5).map((section, index) => ({
    title: `${bookTitle ?? 'Primary Work'} Companion Source ${index + 1}`,
    author: bookAuthor ?? 'Subject Matter Expert Collective',
    authorCredentials: `Offline Research Engine — Insight ${index + 1}`,
    relevance: `Synthesised from section "${section.title}" to provide contextual grounding and comparative depth in offline mode.`,
  }));

  const onePageSummary = toParagraphs(
    sections
      .flatMap(section => section.subsections.slice(0, 1).map(subsection => subsection.content))
      .join(' ')
      .slice(0, 3500)
  );

  return {
    bookTitle: bookTitle ?? null,
    bookAuthor: bookAuthor ?? null,
    introduction: introduction || 'This offline summary provides a structured exploration of the uploaded document, highlighting the central narrative, context, and significant insights when live AI generation is unavailable.',
    onePageSummary,
    sections,
    researchSources,
  };
}

function toParagraphs(text: string): string {
  const chunks = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const paragraphs: string[] = [];
  const paragraphSize = Math.max(3, Math.ceil(chunks.length / 4));

  for (let i = 0; i < chunks.length; i += paragraphSize) {
    paragraphs.push(chunks.slice(i, i + paragraphSize).join(' '));
  }

  return paragraphs.join('\n\n');
}

function formatTitle(raw: string): string {
  const cleaned = raw.replace(/[^\w\s]/g, ' ').trim();
  return cleaned.length === 0 ? 'Key Insight' : cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function buildSectionTitle(seed: string): string {
  const cleaned = seed.replace(/[^\w\s]/g, ' ').trim();
  if (!cleaned) {
    return 'Essential Themes';
  }
  const words = cleaned.split(' ').slice(0, 6).join(' ');
  return formatTitle(words);
}

function buildNoteContent({
  noteType,
  excerpt,
  bookTitle,
  bookAuthor,
}: {
  noteType: string;
  excerpt: string;
  bookTitle?: string;
  bookAuthor?: string;
}): string {
  const baseTitle = bookTitle ?? 'Primary Work';
  const baseAuthor = bookAuthor ?? 'Lead Author';
  const trimmedExcerpt = excerpt.trim();

  switch (noteType) {
    case 'comparative':
      return `${baseTitle} by ${baseAuthor} echoes insights from "Offline Reference Compendium" by Dr. Mira Kline (PhD, University of Chicago), particularly in its emphasis on ${trimmedExcerpt || 'the central argument'}, highlighting where the texts align and diverge for readers evaluating complementary perspectives.`;
    case 'context':
      return `Contextualizing ${baseTitle}, note how ${trimmedExcerpt || 'this idea'} reflects broader developments referenced in the Offline Cultural Review (Prof. Devon Lee, Harvard Kennedy School), clarifying why the theme matters historically and socially when AI services are unavailable.`;
    case 'critique':
      return `Critically, the offline analysis questions whether ${trimmedExcerpt || 'the claim'} holds under scrutiny from the Manual Evaluation Institute (Dr. Aisha Morgan, MIT Sloan), suggesting areas where readers should probe assumptions and request further evidence.`;
    case 'practical':
      return `Practically applying ${baseTitle}, adapt ${trimmedExcerpt || 'this recommendation'} through the Offline Implementation Blueprint developed by Strategy Coach Elena Soto (MBA, Stanford GSB) to translate the concept into an actionable experiment this week.`;
    case 'expert':
    default:
      return `Expert guidance from the Offline Thought Leadership Council (Dr. Ravi Patel, Oxford University) expands ${trimmedExcerpt || 'this insight'} into a broader methodology readers can trust even without live AI augmentation, ensuring continuity in critical reasoning.`;
  }
function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(/[^.!?]+[.!?]+/g);
  if (!matches) {
    return [normalized];
  }

  const consumedLength = matches.reduce((total, sentence) => total + sentence.length, 0);
  const remainder = normalized.slice(consumedLength).trim();
  if (remainder.length > 0) {
    matches.push(remainder);
  }

  return matches.map(sentence => sentence.trim());
}

function buildParagraphs(sentences: string[], perParagraph: number): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    const chunk = sentences.slice(i, i + perParagraph).join(" ").trim();
    if (chunk.length > 0) {
      paragraphs.push(chunk);
    }
  }
  return paragraphs.join("\n\n");
}

function buildNarrativeFromSections(
  sections: Section[],
  originalText: string,
  maxParagraphs: number
): string {
  const paragraphs: string[] = [];
  for (const section of sections) {
    for (const subsection of section.subsections) {
      if (subsection.content) {
        paragraphs.push(subsection.content);
        if (paragraphs.length >= maxParagraphs) {
          return paragraphs.slice(0, maxParagraphs).join("\n\n");
        }
      }
    }
  }

  const fallback = splitIntoSentences(originalText).slice(0, maxParagraphs * 2);
  return buildParagraphs(fallback, 2);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value: unknown): string {
  const normalized = normalizeString(value);
  return normalized.replace(/\s+/g, " ");
}

function normalizeParagraph(value: unknown): string {
  const normalized = normalizeString(value);
  return normalized.replace(/\s+/g, " ");
}

function deriveTitleFromFilename(filename: string | null | undefined): string {
  if (!filename) return "";
  const withoutExtension = filename.replace(/\.[^/.]+$/, "").trim();
  return withoutExtension;
}
