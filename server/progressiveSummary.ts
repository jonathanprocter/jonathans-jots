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
      stage: "AI is generating comprehensive summary with research...",
      sectionsCompleted: 0,
      totalSections: 0,
    });

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
        currentSection: summaryData.sections[i]?.title || `Section ${i + 1}`,
        partialContent: {
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
      partialContent: summaryData,
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
