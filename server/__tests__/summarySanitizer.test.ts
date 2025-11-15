import { describe, expect, it } from "vitest";
import { sanitizeStructuredSummary, type StructuredSummary } from "../progressiveSummary";

const countWords = (value: string): number => value.split(/\s+/).filter(Boolean).length;

describe("sanitizeStructuredSummary", () => {
  it("pads sparse summaries to exceed Jonathan's Jots standards", () => {
    const raw: StructuredSummary = {
      bookTitle: "",
      bookAuthor: "",
      introduction: "",
      onePageSummary: "",
      sections: [
        {
          title: "",
          subsections: [
            {
              title: "",
              content: "Readers learn one core idea about slowing down.",
              jotsNotes: [],
            },
          ],
        },
      ],
      researchSources: [],
    };

    const sanitized = sanitizeStructuredSummary(raw, {
      fallbackTitle: "Test Book",
      fallbackAuthor: "Test Author",
      documentText:
        "This document provides deep insight into mindful productivity. " +
        "It emphasises emotional regulation, strategic rest, and evidence-based routines." +
        " Through comparative research we see why comprehensive notes must exceed Shortform expectations.",
    });

    expect(sanitized.sections.length).toBeGreaterThanOrEqual(5);
    sanitized.sections.forEach(section => {
      expect(section.subsections.length).toBeGreaterThanOrEqual(2);
      section.subsections.forEach(subsection => {
        expect(subsection.jotsNotes.length).toBeGreaterThanOrEqual(1);
        subsection.jotsNotes.forEach(note => {
          const words = countWords(note.content);
          expect(words).toBeGreaterThanOrEqual(100);
          expect(words).toBeLessThanOrEqual(160);
        });
      });
    });

    expect(sanitized.researchSources.length).toBeGreaterThanOrEqual(8);
    expect(sanitized.researchSources.length).toBeLessThanOrEqual(12);
    sanitized.researchSources.forEach(source => {
      expect(source.title).not.toHaveLength(0);
      expect(source.relevance).not.toHaveLength(0);
    });

    expect(sanitized.introduction.length).toBeGreaterThan(0);
    expect(sanitized.onePageSummary.length).toBeGreaterThan(0);
  });
});
