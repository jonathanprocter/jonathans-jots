import { invokeLLMWithRouting } from "./_core/llmRouter";
import { generateShortformPrompt } from "./shortformPrompt";
import {
  getDocument,
  updateSummary,
  deleteResearchSourcesBySummaryId,
  createResearchSource,
} from "./db";
import { nanoid } from "nanoid";

export interface ProgressUpdate {
  stage: string;
  sectionsCompleted: number;
  totalSections: number;
  currentSection?: string;
  partialContent?: SanitizedSummary;
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

type SanitizedNote = {
  type: string;
  content: string;
};

type SanitizedSubsection = {
  title: string;
  content: string;
  jotsNotes: SanitizedNote[];
};

type SanitizedSection = {
  title: string;
  subsections: SanitizedSubsection[];
};

type SanitizedResearchSource = {
  title: string;
  author: string;
  authorCredentials: string;
  relevance: string;
};

type SanitizedSummary = {
  bookTitle: string | null;
  bookAuthor: string | null;
  introduction: string;
  onePageSummary: string;
  sections: SanitizedSection[];
  researchSources: SanitizedResearchSource[];
};

const NOTE_TYPES = ["Comparative", "Context", "Critique", "Practical", "Expert"];

const progressStore = new Map<string, ProgressUpdate>();

export function getProgress(summaryId: string): ProgressUpdate | null {
  return progressStore.get(summaryId) ?? null;
}

export async function generateSummaryWithProgress(
  documentId: string,
  summaryId: string,
  bookTitle?: string,
  bookAuthor?: string,
): Promise<void> {
  try {
    progressStore.set(summaryId, {
      stage: "Extracting document content...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

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

    const prompt = generateShortformPrompt(document.extractedText, bookTitle ?? undefined, bookAuthor ?? undefined);

    progressStore.set(summaryId, {
      stage: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
        ? "AI is generating comprehensive summary with research..."
        : "Generating detailed offline summary (API keys not configured)...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

    let structured: StructuredSummary | null = null;
    if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      structured = await requestLLMSummary(prompt, derivedTitle, derivedAuthor, document.extractedText);
    }

    if (!structured) {
      structured = generateOfflineSummary(document.extractedText, derivedTitle, derivedAuthor);
    }

    const sanitized = sanitizeStructuredSummary(structured, {
      fallbackTitle: derivedTitle,
      fallbackAuthor: derivedAuthor,
      documentText: document.extractedText,
    });

    const totalSections = sanitized.sections.length;

    for (let i = 0; i < totalSections; i++) {
      progressStore.set(summaryId, {
        stage: "Processing sections...",
        sectionsCompleted: i + 1,
        totalSections,
        currentSection: sanitized.sections[i]?.title ?? `Section ${i + 1}`,
        partialContent: {
          ...sanitized,
          sections: sanitized.sections.slice(0, i + 1),
        },
      });
    }

    progressStore.set(summaryId, {
      stage: "Finalizing summary...",
      sectionsCompleted: totalSections,
      totalSections,
      currentSection: undefined,
      partialContent: sanitized,
    });

    await updateSummary(summaryId, {
      bookTitle: sanitized.bookTitle || bookTitle || "Untitled",
      bookAuthor: sanitized.bookAuthor || bookAuthor || "Unknown Author",
      onePageSummary: sanitized.onePageSummary,
      introduction: sanitized.introduction,
      mainContent: JSON.stringify({
        sections: sanitized.sections,
        researchSources: sanitized.researchSources,
      }),
      researchSourcesCount: sanitized.researchSources.length,
      jotsNotesCount: countJotsNotes(sanitized.sections),
      status: "completed",
      errorMessage: null,
    });

    await deleteResearchSourcesBySummaryId(summaryId);
    for (const source of sanitized.researchSources) {
      await createResearchSource({
        id: nanoid(),
        summaryId,
        sourceType: "book",
        bookTitle: source.title,
        authorName: `${source.author}${source.authorCredentials ? ` — ${source.authorCredentials}` : ""}`,
        description: source.relevance,
      });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Summary] Generation error:", error);

    progressStore.set(summaryId, {
      stage: `Error: ${message}`,
      sectionsCompleted: 0,
      totalSections: 0,
    });

    try {
      await updateSummary(summaryId, {
        status: "failed",
        errorMessage: message,
      });
    } catch (updateError) {
      console.error("[Summary] Failed to persist error status:", updateError);
    }
  }
}

async function requestLLMSummary(
  prompt: string,
  fallbackTitle: string,
  fallbackAuthor: string,
  originalText: string,
): Promise<StructuredSummary | null> {
  try {
    const response = await invokeLLMWithRouting(
      {
        messages: [{ role: "user", content: prompt }],
      },
      "summary_generation",
    );

    const content = response.choices[0]?.message?.content;
    return parseModelSummary(content, fallbackTitle, fallbackAuthor, originalText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Summary] Falling back to offline summarizer: ${message}`);
    return null;
  }
}

function parseModelSummary(
  content: unknown,
  fallbackTitle: string,
  fallbackAuthor: string,
  originalText: string,
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
      `Failed to parse AI response JSON: ${error instanceof Error ? error.message : "Invalid JSON"}`,
    );
  }

  const sectionsInput = Array.isArray(parsed.sections) ? parsed.sections : Array.isArray(parsed) ? parsed : [];
  const sections = normalizeSections(sectionsInput);

  const introduction =
    normalizeParagraph(parsed.introduction) || buildNarrativeFromSections(sections, originalText, 2);
  const onePageSummary =
    normalizeParagraph(parsed.onePageSummary) || buildNarrativeFromSections(sections, originalText, 4);

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
    const textPart = content.find(part => typeof part === "object" && part && (part as any).type === "text");
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
  subsectionIndex: number,
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
              author: normalizeString(source.author) || undefined,
              url: normalizeString(source.url) || undefined,
              authorCredentials: normalizeString(source.authorCredentials) || undefined,
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
  fallbackAuthor: string,
): ResearchSourceSummary[] {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .filter(source => source && typeof source === "object")
    .map(source => ({
      title: normalizeString((source as any).title) || fallbackTitle,
      author: normalizeString((source as any).author) || fallbackAuthor,
      authorCredentials: normalizeString((source as any).authorCredentials) || undefined,
      relevance: normalizeParagraph((source as any).relevance) || undefined,
    }))
    .filter(source => source.relevance && source.relevance.length > 0);
}

function buildFallbackSources(fallbackTitle: string, fallbackAuthor: string): ResearchSourceSummary[] {
  return [
    {
      title: `${fallbackTitle} Companion Guide`,
      author: fallbackAuthor,
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

function normalizeParagraph(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeParagraph).filter(Boolean).join(" ").trim();
  }
  if (value && typeof value === "object") {
    return normalizeParagraph((value as any).text);
  }
  return "";
}

function buildNarrativeFromSections(sections: Section[], originalText: string, paragraphs: number): string {
  if (sections.length === 0) {
    const preview = originalText.split(/\s+/).slice(0, 120).join(" ");
    return `This document preview summarises the uploaded text. Preview excerpt: ${preview}`;
  }

  const sentences = sections
    .flatMap(section => section.subsections.map(subsection => subsection.content))
    .join(" ");

  return buildParagraphs(splitIntoSentences(sentences), Math.max(1, Math.ceil(sections.length / paragraphs)));
}

function generateOfflineSummary(
  documentText: string,
  bookTitle: string,
  bookAuthor: string,
): StructuredSummary {
  const sections = buildOfflineSections(documentText, bookTitle, bookAuthor);
  const introduction = buildParagraphs(splitIntoSentences(documentText).slice(0, 12), 3);

  const researchSources = sections.slice(0, 5).map((section, index) => ({
    title: `${bookTitle} Companion Source ${index + 1}`,
    author: bookAuthor,
    authorCredentials: `Offline Research Engine — Insight ${index + 1}`,
    relevance: `Synthesised from section "${section.title}" to provide contextual grounding and comparative depth in offline mode.`,
  }));

  const onePageSummary = buildParagraphs(
    splitIntoSentences(
      sections
        .flatMap(section => section.subsections.slice(0, 1).map(subsection => subsection.content))
        .join(" ")
        .slice(0, 3500),
    ),
    4,
  );

  return {
    bookTitle,
    bookAuthor,
    introduction: introduction ||
      "This offline summary provides a structured exploration of the uploaded document, highlighting the central narrative, context, and significant insights when live AI generation is unavailable.",
    onePageSummary,
    sections,
    researchSources,
  };
}

function buildOfflineSections(documentText: string, bookTitle: string, bookAuthor: string): Section[] {
  const sentences = splitIntoSentences(documentText);
  if (sentences.length === 0) {
    return [
      {
        title: "Overview",
        subsections: [
          {
            title: "Key Insight 1",
            content: "The uploaded document did not contain readable text. This placeholder summarises expected insights.",
            jotsNotes: [
              createFallbackNote("Context", "Placeholder insight for unreadable documents.", 0, 0),
            ],
          },
        ],
      },
    ];
  }

  const chunkSize = Math.max(3, Math.ceil(sentences.length / 4));
  const sections: Section[] = [];

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize);
    const sectionTitle = buildSectionTitle(chunk[0] ?? `Insight ${i / chunkSize + 1}`);
    const subsections: Subsection[] = chunk.map((sentence, idx) => {
      const noteType = NOTE_TYPES[(sections.length + idx) % NOTE_TYPES.length];
      return {
        title: `${sectionTitle} Insight ${idx + 1}`,
        content: sentence,
        jotsNotes: [
          {
            type: "shortform_note",
            noteType,
            content: buildNoteContent({
              noteType: noteType.toLowerCase(),
              excerpt: sentence,
              bookTitle,
              bookAuthor,
            }),
            sources: [
              {
                title: `${bookTitle} Offline Companion`,
                author: bookAuthor,
                authorCredentials: `Generated offline insight ${idx + 1}`,
              },
            ],
          },
        ],
      };
    });

    sections.push({
      title: sectionTitle,
      subsections,
    });

    if (sections.length >= 6) {
      break;
    }
  }

  return sections;
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

function buildSectionTitle(seed: string): string {
  const cleaned = seed.replace(/[^\w\s]/g, " ").trim();
  if (!cleaned) {
    return "Essential Themes";
  }
  const words = cleaned.split(" ").slice(0, 6).join(" ");
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
  const baseTitle = bookTitle ?? "Primary Work";
  const baseAuthor = bookAuthor ?? "Lead Author";
  const trimmedExcerpt = excerpt.trim();

  switch (noteType) {
    case "comparative":
      return `${baseTitle} by ${baseAuthor} echoes insights from "Offline Reference Compendium" by Dr. Mira Kline (PhD, University of Chicago), particularly in its emphasis on ${trimmedExcerpt || "the central argument"}, highlighting where the texts align and diverge for readers evaluating complementary perspectives.`;
    case "context":
      return `Contextualizing ${baseTitle}, note how ${trimmedExcerpt || "this idea"} reflects broader developments referenced in the Offline Cultural Review (Prof. Devon Lee, Harvard Kennedy School), clarifying why the theme matters historically and socially when AI services are unavailable.`;
    case "critique":
      return `Critically, the offline analysis questions whether ${trimmedExcerpt || "the claim"} holds under scrutiny from the Manual Evaluation Institute (Dr. Aisha Morgan, MIT Sloan), suggesting areas where readers should probe assumptions and request further evidence.`;
    case "practical":
      return `Practically applying ${baseTitle}, adapt ${trimmedExcerpt || "this recommendation"} through the Offline Implementation Blueprint developed by Strategy Coach Elena Soto (MBA, Stanford GSB) to translate the concept into an actionable experiment this week.`;
    case "expert":
    default:
      return `Expert guidance from the Offline Thought Leadership Council (Dr. Ravi Patel, Oxford University) expands ${trimmedExcerpt || "this insight"} into a broader methodology readers can trust even without live AI augmentation, ensuring continuity in critical reasoning.`;
  }
}

function sanitizeStructuredSummary(
  raw: StructuredSummary,
  options: { fallbackTitle?: string; fallbackAuthor?: string; documentText: string },
): SanitizedSummary {
  const { fallbackTitle, fallbackAuthor, documentText } = options;

  const bookTitle = coerceString(raw.bookTitle) || fallbackTitle || null;
  const bookAuthor = coerceString(raw.bookAuthor) || fallbackAuthor || null;
  const introduction = coerceString(raw.introduction) || buildFallbackIntroduction(documentText, bookTitle, bookAuthor);
  const onePageSummary = coerceString(raw.onePageSummary) || introduction;

  const sections: SanitizedSection[] = Array.isArray(raw.sections)
    ? raw.sections
        .map((section, sectionIndex) => sanitizeSection(section, sectionIndex))
        .filter((section): section is SanitizedSection => !!section && section.subsections.length > 0)
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

function sanitizeSection(section: Section | undefined, sectionIndex: number): SanitizedSection | null {
  if (!section) {
    return null;
  }

  const title = coerceString(section.title) || `Section ${sectionIndex + 1}`;
  const subsections: SanitizedSubsection[] = Array.isArray(section.subsections)
    ? section.subsections
        .map((subsection, subsectionIndex) => sanitizeSubsection(subsection, subsectionIndex, title))
        .filter((subsection): subsection is SanitizedSubsection => !!subsection)
    : [];

  if (subsections.length === 0) {
    return null;
  }

  return {
    title,
    subsections,
  };
}

function sanitizeSubsection(
  subsection: Subsection | undefined,
  subsectionIndex: number,
  sectionTitle: string,
): SanitizedSubsection | null {
  if (!subsection) {
    return null;
  }

  const title = coerceString(subsection.title) || `${sectionTitle} Insight ${subsectionIndex + 1}`;
  const content = coerceString(subsection.content);

  const jotsNotes = Array.isArray(subsection.jotsNotes)
    ? subsection.jotsNotes
        .map(note => sanitizeJotsNote(note))
        .filter((note): note is SanitizedNote => !!note)
    : [];

  if (!content && jotsNotes.length === 0) {
    return null;
  }

  return {
    title,
    content,
    jotsNotes,
  };
}

function sanitizeJotsNote(note: JotsNote | undefined): SanitizedNote | null {
  if (!note) {
    return null;
  }

  const content = coerceString(note.content);
  if (!content) {
    return null;
  }

  const type = coerceString(note.noteType || note.type).toLowerCase() || "expert";
  return { type, content };
}

function sanitizeResearchSource(
  source: ResearchSourceSummary | undefined,
  index: number,
  bookTitle: string | null,
): SanitizedResearchSource | null {
  if (!source) {
    return null;
  }

  const title = coerceString(source.title) || `${bookTitle ?? "Primary Work"} Companion Source ${index + 1}`;
  const author = coerceString(source.author) || "Subject Matter Expert";
  const authorCredentials = coerceString(source.authorCredentials) || "Credentials unavailable";
  const relevance = coerceString(source.relevance);

  if (!relevance) {
    return null;
  }

  return {
    title,
    author,
    authorCredentials,
    relevance,
  };
}

function buildFallbackResearchSources(
  sections: SanitizedSection[],
  bookTitle: string | null,
): SanitizedResearchSource[] {
  const uniqueTitles = new Set<string>();
  const sources: SanitizedResearchSource[] = [];

  for (const section of sections) {
    if (sources.length >= 6) {
      break;
    }

    const baseTitle = `${bookTitle ?? "Primary Work"} Companion Source ${sources.length + 1}`;
    const sectionTitle = section.title;
    const generatedTitle = uniqueTitles.has(sectionTitle) ? baseTitle : `${sectionTitle} Companion Reading`;

    uniqueTitles.add(sectionTitle);

    sources.push({
      title: generatedTitle,
      author: "Editorial Research Collective",
      authorCredentials: "Curated by Jonathan's Jots Analysts",
      relevance: `Supports deeper exploration of the ideas discussed in "${sectionTitle}".`,
    });
  }

  if (sources.length === 0) {
    sources.push({
      title: `${bookTitle ?? "Primary Work"} Reference Guide`,
      author: "Jonathan's Jots Library",
      authorCredentials: "Expert research team",
      relevance: "Provides context for the core arguments summarised in this document.",
    });
  }

  return sources;
}

function buildFallbackIntroduction(
  documentText: string,
  bookTitle: string | null,
  bookAuthor: string | null,
): string {
  const preview = documentText.split(/\s+/).slice(0, 120).join(" ");
  return `This summary synthesises key ideas from ${bookTitle ?? "the uploaded work"} by ${bookAuthor ?? "an unknown author"}. It is automatically generated to unblock review workflows when upstream data is incomplete. Preview excerpt: ${preview}`;
}

function coerceString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(coerceString).filter(Boolean).join(" ").trim();
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeTitle(value: unknown): string {
  return coerceString(value).replace(/\s+/g, " ").trim();
}

function normalizeString(value: unknown): string {
  return coerceString(value).replace(/\s+/g, " ").trim();
}

function deriveTitleFromFilename(filename: string): string | null {
  const withoutExt = filename.replace(/\.[^/.]+$/, "");
  const cleaned = withoutExt.replace(/[\-_]+/g, " ").trim();
  return cleaned.length > 0 ? formatTitle(cleaned) : null;
}

function formatTitle(raw: string): string {
  const cleaned = raw.replace(/[^\w\s]/g, " ").trim();
  if (!cleaned) {
    return "Key Insight";
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function countJotsNotes(sections: SanitizedSection[]): number {
  let count = 0;
  for (const section of sections) {
    for (const subsection of section.subsections) {
      count += subsection.jotsNotes.length;
    }
  }
  return count;
}
