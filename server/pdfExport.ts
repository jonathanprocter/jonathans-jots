import jsPDF from "jspdf";

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

type SummaryData = {
  bookTitle: string | null;
  bookAuthor: string | null;
  introduction: string;
  onePageSummary: string;
  sections: SanitizedSection[];
  researchSources: SanitizedResearchSource[];
};

/**
 * Generate a PDF export of a Jonathan's Jots summary
 * with professional formatting matching the web display
 */
export function generateSummaryPDF(summary: SummaryData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;

  // Colors
  const cognacColor: [number, number, number] = [212, 119, 46]; // #D4772E
  const darkBlue: [number, number, number] = [46, 64, 87]; // #2E4057
  const grayBackground: [number, number, number] = [241, 241, 241]; // #F1F1F1
  const textGray: [number, number, number] = [51, 51, 51]; // #333333

  // Helper function to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to wrap and add text
  const addWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    fontStyle: string = "normal",
    color: [number, number, number] = textGray
  ): number => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.5;
    
    lines.forEach((line: string, index: number) => {
      if (checkPageBreak(lineHeight)) {
        y = yPosition;
      }
      doc.text(line, x, y + index * lineHeight);
    });
    
    return y + lines.length * lineHeight;
  };

  // Helper to add paragraphs with spacing
  const addParagraphs = (text: string, fontSize: number = 11): void => {
    const paragraphs = text.split("\\n\\n");
    paragraphs.forEach((para) => {
      if (para.trim()) {
        yPosition = addWrappedText(para.trim(), margin, yPosition, maxWidth, fontSize);
        yPosition += 6; // Space between paragraphs
      }
    });
  };

  // === COVER PAGE ===
  // Gradient-like background (simulated with rectangles)
  doc.setFillColor(244, 228, 215); // Light cognac
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Title
  yPosition = 60;
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkBlue);
  const titleLines = doc.splitTextToSize(
    `Summary of ${summary.bookTitle || "Untitled"}`,
    maxWidth
  );
  titleLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 12;
  });

  // Author
  yPosition += 10;
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Original book by ${summary.bookAuthor || "Unknown Author"}`, margin, yPosition);

  // Introduction on cover
  yPosition += 20;
  doc.setFontSize(12);
  doc.setTextColor(...textGray);
  addParagraphs(summary.introduction, 12);

  // Logo watermark (text-based since we don't have the image)
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Jonathan's Jots", pageWidth - margin - 40, pageHeight - margin);

  // === NEW PAGE: ONE-PAGE SUMMARY ===
  doc.addPage();
  yPosition = margin;

  // Cognac separator bar
  doc.setFillColor(...cognacColor);
  doc.rect(margin, yPosition, maxWidth, 3, "F");
  yPosition += 10;

  // Section title with left border
  doc.setFillColor(...cognacColor);
  doc.rect(margin, yPosition, 3, 10, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkBlue);
  doc.text("1-Page Summary", margin + 8, yPosition + 7);
  yPosition += 15;

  // One-page summary content
  addParagraphs(summary.onePageSummary, 11);

  // Cognac separator
  yPosition += 5;
  doc.setFillColor(...cognacColor);
  doc.rect(margin, yPosition, maxWidth, 3, "F");
  yPosition += 15;

  // === MAIN CONTENT SECTIONS ===
  summary.sections.forEach((section, sectionIndex) => {
    checkPageBreak(30);

    // Section title with left border
    doc.setFillColor(...cognacColor);
    doc.rect(margin, yPosition, 3, 10, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkBlue);
    const sectionTitleLines = doc.splitTextToSize(section.title, maxWidth - 10);
    sectionTitleLines.forEach((line: string, i: number) => {
      doc.text(line, margin + 8, yPosition + 7 + i * 6);
    });
    yPosition += 7 + sectionTitleLines.length * 6 + 5;

    // Subsections
    section.subsections.forEach((subsection) => {
      checkPageBreak(25);

      // Subsection title
      if (subsection.title) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkBlue);
        yPosition = addWrappedText(subsection.title, margin, yPosition, maxWidth, 14, "bold", darkBlue);
        yPosition += 8;
      }

      // Subsection content
      addParagraphs(subsection.content, 11);

      // Jonathan's Jots Notes (gray boxes)
      subsection.jotsNotes.forEach((note) => {
        checkPageBreak(40);

        const noteHeight = doc.splitTextToSize(note.content, maxWidth - 10).length * 5 + 15;
        
        // Gray background box
        doc.setFillColor(...grayBackground);
        doc.rect(margin, yPosition, maxWidth, noteHeight, "F");

        // Border
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPosition, maxWidth, noteHeight);

        // Note content
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 102, 204); // Blue
        doc.text("(Jonathan's Jots note:", margin + 5, yPosition);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textGray);
        yPosition = addWrappedText(
          note.content + ")",
          margin + 5,
          yPosition + 5,
          maxWidth - 10,
          10
        );
        
        yPosition += 10;
      });

      yPosition += 5;
    });

    // Separator after section (except last)
    if (sectionIndex < summary.sections.length - 1) {
      checkPageBreak(10);
      doc.setFillColor(...cognacColor);
      doc.rect(margin, yPosition, maxWidth, 3, "F");
      yPosition += 15;
    }
  });

  // === RESEARCH SOURCES ===
  if (summary.researchSources.length > 0) {
    checkPageBreak(30);
    
    // Separator
    doc.setFillColor(...cognacColor);
    doc.rect(margin, yPosition, maxWidth, 3, "F");
    yPosition += 15;

    // Section title
    doc.setFillColor(...cognacColor);
    doc.rect(margin, yPosition, 3, 10, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkBlue);
    doc.text("Research Sources", margin + 8, yPosition + 7);
    yPosition += 20;

    // Sources
    summary.researchSources.forEach((source) => {
      checkPageBreak(30);

      // Source box
      const sourceHeight = 25;
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, maxWidth, sourceHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, yPosition, maxWidth, sourceHeight);

      // Source title
      yPosition += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkBlue);
      yPosition = addWrappedText(source.title, margin + 3, yPosition, maxWidth - 6, 11, "bold", darkBlue);

      // Author and credentials
      yPosition += 2;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const authorText = `by ${source.author} ${source.authorCredentials ? `(${source.authorCredentials})` : ""}`;
      doc.text(authorText, margin + 3, yPosition);

      // Relevance
      if (source.relevance) {
        yPosition += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        yPosition = addWrappedText(source.relevance, margin + 3, yPosition, maxWidth - 6, 9, "italic", [120, 120, 120]);
      }

      yPosition += 10;
    });
  }

  return doc;
}
