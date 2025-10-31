import React from 'react';

type SummaryData = {
  id?: string;
  documentId?: string;
  userId?: string;
  bookTitle: string | null;
  bookAuthor: string | null;
  introduction: string | null;
  onePageSummary: string | null;
  mainContent: string | null; // JSON string
  status?: string;
  jotsNotesCount?: number | null;
  [key: string]: any;
};

interface JotsSummaryRendererProps {
  summary: SummaryData;
}

export default function JotsSummaryRenderer({ summary }: JotsSummaryRendererProps) {
  // Parse mainContent JSON
  let parsedContent: any = { sections: [], researchSources: [] };
  try {
    if (summary.mainContent) {
      parsedContent = JSON.parse(summary.mainContent);
    }
  } catch (e) {
    console.error('Failed to parse mainContent:', e);
  }

  const bookTitle = summary.bookTitle || 'Untitled';
  const bookAuthor = summary.bookAuthor || 'Unknown Author';
  const introduction = summary.introduction || '';
  const onePageSummary = summary.onePageSummary || '';
  const sections = parsedContent.sections || [];
  const researchSources = parsedContent.researchSources || [];

  // Helper to render text with bold and italic formatting
  const renderFormattedText = (text: string) => {
    // Split by bold markers (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part: string, i: number) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const innerText = part.slice(2, -2);
        // Check for italic within bold
        if (innerText.includes('*')) {
          const italicParts = innerText.split(/(\*.*?\*)/g);
          return (
            <strong key={i}>
              {italicParts.map((ip: string, j: number) => 
                ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**') ? 
                  <em key={j}>{ip.slice(1, -1)}</em> : ip
              )}
            </strong>
          );
        }
        return <strong key={i}>{innerText}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  // Helper to render a paragraph with formatting
  const renderParagraph = (text: string, className: string = "") => {
    return (
      <p className={`mb-4 leading-relaxed ${className}`}>
        {renderFormattedText(text)}
      </p>
    );
  };

  // Helper to render Jonathan's Jots notes in GRAY BACKGROUND BOXES - Mobile Optimized
  const renderJotsNote = (note: any) => {
    const getNoteTypeLabel = (type: string) => {
      const labels: { [key: string]: string } = {
        'comparative': '📊 Comparative Analysis',
        'context': '🌍 Historical Context',
        'critique': '🤔 Critical Perspective',
        'practical': '💡 Practical Application',
        'expert': '🎓 Expert Insight'
      };
      return labels[type] || 'Jonathan\'s Jots note';
    };

    return (
      <div className="my-4 sm:my-6 p-4 sm:p-5 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-[#D4772E] rounded-md shadow-sm">
        {note.type && (
          <div className="mb-2">
            <span className="inline-block px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-[#2E4057] bg-white rounded-full border border-gray-300">
              {getNoteTypeLabel(note.type)}
            </span>
          </div>
        )}
        <p className="text-sm sm:text-base leading-relaxed text-gray-800">
          {renderFormattedText(note.content)}
          {note.sources && note.sources.length > 0 && (
            <span>
              {" "}According to{" "}
              {note.sources.map((source: any, i: number) => (
                <span key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4772E] underline hover:text-[#2E4057] font-medium transition-colors"
                  >
                    {source.title}
                  </a>
                  {i < note.sources.length - 1 && ", "}
                </span>
              ))}
            </span>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Content */}
      <div className="container py-3 sm:py-6 md:py-8 max-w-4xl px-3 sm:px-4 md:px-6">
        {/* Professional Cover Page - Mobile Optimized */}
        <div className="bg-gradient-to-br from-white to-[#F4E4D7] p-4 sm:p-8 md:p-12 rounded-lg shadow-lg mb-6 sm:mb-10 md:mb-12 min-h-[280px] sm:min-h-[350px] md:min-h-[400px] flex flex-col justify-between">
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#2E4057] mb-2 sm:mb-3 md:mb-4 leading-tight">
              Summary of {bookTitle}
            </h1>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-4 sm:mb-6 md:mb-8">
              Original book by {bookAuthor}
            </h2>

            {/* Introduction paragraphs on cover */}
            {introduction && (
              <div className="text-sm sm:text-base md:text-lg text-gray-700 space-y-3 sm:space-y-4">
                {introduction.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{renderFormattedText(para)}</p>
                ))}
              </div>
            )}
          </div>

          {/* Logo watermark */}
          <div className="flex justify-end mt-6 sm:mt-8">
            <img
              src="/jonathansjots-logo.svg"
              alt="Jonathan's Jots"
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 opacity-40"
            />
          </div>
        </div>

        {/* Cognac Separator Bar */}
        <div className="h-1 bg-[#D4772E] mb-6 sm:mb-10 md:mb-12"></div>

        {/* 1-Page Summary Section - Mobile Optimized */}
        {onePageSummary && (
          <>
            <div className="mb-6 sm:mb-10 md:mb-12">
              <div className="border-l-4 border-[#D4772E] pl-4 sm:pl-6 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2E4057]">
                  1-Page Summary
                </h2>
              </div>
              <div className="text-sm sm:text-base md:text-lg text-gray-800 space-y-3 sm:space-y-4">
                {onePageSummary.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{renderFormattedText(para)}</p>
                ))}
              </div>
            </div>

            {/* Cognac Separator Bar */}
            <div className="h-1 bg-[#D4772E] mb-6 sm:mb-10 md:mb-12"></div>
          </>
        )}

        {/* Main Content Sections - Mobile Optimized */}
        {sections.map((section: any, sectionIndex: number) => (
          <div key={sectionIndex} className="mb-10 sm:mb-14 md:mb-16">
            {/* Section Title */}
            <div className="border-l-4 border-[#D4772E] pl-4 sm:pl-6 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2E4057]">
                {section.title}
              </h2>
            </div>

            {/* Subsections */}
            {section.subsections && section.subsections.map((subsection: any, subIndex: number) => (
              <div key={subIndex} className="mb-6 sm:mb-8">
                {/* Subsection Title */}
                {subsection.title && (
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#2E4057] mb-3 sm:mb-4">
                    {subsection.title}
                  </h3>
                )}

                {/* Subsection Content */}
                {subsection.content && (
                  <div className="text-sm sm:text-base md:text-lg text-gray-800 space-y-3 sm:space-y-4">
                    {subsection.content.split('\n\n').map((para: string, i: number) => (
                      <p key={i} className="leading-relaxed">{renderFormattedText(para)}</p>
                    ))}
                  </div>
                )}

                {/* Jonathan's Jots Notes - GRAY BOXES - Mobile Optimized */}
                {subsection.jotsNotes && subsection.jotsNotes.map((note: any, noteIndex: number) => (
                  <div key={noteIndex}>
                    {renderJotsNote(note)}
                  </div>
                ))}
              </div>
            ))}

            {/* Cognac Separator Bar after each section */}
            {sectionIndex < sections.length - 1 && (
              <div className="h-1 bg-[#D4772E] mt-6 sm:mt-10 md:mt-12"></div>
            )}
          </div>
        ))}

        {/* Research Sources Section - Mobile Optimized */}
        {researchSources && researchSources.length > 0 && (
          <>
            <div className="h-1 bg-[#D4772E] mb-6 sm:mb-10 md:mb-12"></div>
            <div className="mb-10 sm:mb-12">
              <div className="border-l-4 border-[#D4772E] pl-4 sm:pl-6 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2E4057]">
                  Research Sources
                </h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {researchSources.map((source: any, i: number) => (
                  <div key={i} className="p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-semibold text-[#2E4057] text-base sm:text-lg">
                      {source.title}
                    </p>
                    <p className="text-gray-700 text-xs sm:text-sm mt-1">
                      by {source.author} {source.authorCredentials && `(${source.authorCredentials})`}
                    </p>
                    {source.relevance && (
                      <p className="text-gray-600 text-xs sm:text-sm mt-2 italic leading-relaxed">
                        {source.relevance}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
