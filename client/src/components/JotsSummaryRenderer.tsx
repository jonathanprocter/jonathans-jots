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

  // Helper to render text exactly as provided - NO MARKDOWN PARSING
  // The AI generates clean text without markdown syntax
  const renderFormattedText = (text: string) => {
    return text;
  };

  // Helper to render a paragraph with formatting
  const renderParagraph = (text: string, className: string = "") => {
    return (
      <p className={`mb-4 leading-relaxed ${className}`}>
        {text}
      </p>
    );
  };

  // Helper to render Jonathan's Jots notes in GRAY BACKGROUND BOXES (CRITICAL!)
  const renderJotsNote = (note: any) => {
    return (
      <div className="my-6 p-5 rounded-xl border" style={{ background: 'var(--stone-50)', borderColor: 'var(--stone-200)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--slate-800)' }}>
          <span className="font-semibold" style={{ color: 'var(--slate-700)' }}>(Jonathan's Jots note:</span>{' '}
          {note.content}
          {note.sources && note.sources.length > 0 && (
            <span>
              {" "}According to{" "}
              {note.sources.map((source: any, i: number) => (
                <span key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--slate-600)' }}
                  >
                    {source.title}
                  </a>
                  {i < note.sources.length - 1 && ", "}
                </span>
              ))}
            </span>
          )}
          <span className="font-semibold" style={{ color: 'var(--slate-700)' }}>)</span>
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--stone-50)' }}>
      {/* Content */}
      <div className="container py-4 sm:py-8 max-w-4xl px-4">
        {/* Professional Cover Page */}
        <div className="p-6 sm:p-12 rounded-xl border shadow-sm mb-8 sm:mb-12 min-h-[300px] sm:min-h-[400px] flex flex-col justify-between" style={{ background: 'white', borderColor: 'var(--stone-200)' }}>
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.035em' }}>
              Summary of {bookTitle}
            </h1>
            <h2 className="text-lg sm:text-xl lg:text-2xl mb-6 sm:mb-8" style={{ color: 'var(--slate-600)' }}>
              Original book by {bookAuthor}
            </h2>
            
            {/* Introduction paragraphs on cover */}
            {introduction && (
              <div className="text-base sm:text-lg space-y-4" style={{ color: 'var(--slate-700)' }}>
                {introduction.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{para}</p>
                ))}
              </div>
            )}
          </div>

          {/* Logo watermark */}
          <div className="flex justify-end mt-8">
            <img
              src="/jonathansjots-logo.svg"
              alt="Jonathan's Jots"
              className="w-16 h-16 sm:w-20 sm:h-20 opacity-30"
            />
          </div>
        </div>

        {/* Separator Bar */}
        <div className="h-px mb-8 sm:mb-12" style={{ background: 'var(--stone-200)' }}></div>

        {/* 1-Page Summary Section */}
        {onePageSummary && (
          <>
            <div className="mb-8 sm:mb-12">
              <div className="border-l-4 pl-6 mb-6" style={{ borderColor: 'var(--slate-600)' }}>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                  1-Page Summary
                </h2>
              </div>
              <div className="text-base sm:text-lg space-y-4" style={{ color: 'var(--slate-800)' }}>
                {onePageSummary.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{para}</p>
                ))}
              </div>
            </div>

            {/* Separator Bar */}
            <div className="h-px mb-8 sm:mb-12" style={{ background: 'var(--stone-200)' }}></div>
          </>
        )}

        {/* Main Content Sections */}
        {sections.map((section: any, sectionIndex: number) => (
          <div key={sectionIndex} className="mb-12 sm:mb-16">
            {/* Section Title */}
            <div className="border-l-4 pl-6 mb-6" style={{ borderColor: 'var(--slate-600)' }}>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                {section.title}
              </h2>
            </div>

            {/* Subsections */}
            {section.subsections && section.subsections.map((subsection: any, subIndex: number) => (
              <div key={subIndex} className="mb-8">
                {/* Subsection Title */}
                {subsection.title && (
                  <h3 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--slate-800)', letterSpacing: '-0.02em' }}>
                    {subsection.title}
                  </h3>
                )}

                {/* Subsection Content */}
                {subsection.content && (
                  <div className="text-base sm:text-lg space-y-4" style={{ color: 'var(--slate-800)' }}>
                    {subsection.content.split('\n\n').map((para: string, i: number) => (
                      <p key={i} className="leading-relaxed">{para}</p>
                    ))}
                  </div>
                )}

                {/* Jonathan's Jots Notes - GRAY BOXES */}
                {subsection.jotsNotes && subsection.jotsNotes.map((note: any, noteIndex: number) => (
                  <div key={noteIndex}>
                    {renderJotsNote(note)}
                  </div>
                ))}
              </div>
            ))}

            {/* Separator Bar after each section */}
            {sectionIndex < sections.length - 1 && (
              <div className="h-px mt-8 sm:mt-12" style={{ background: 'var(--stone-200)' }}></div>
            )}
          </div>
        ))}

        {/* Research Sources Section */}
        {researchSources && researchSources.length > 0 && (
          <>
            <div className="h-px mb-8 sm:mb-12" style={{ background: 'var(--stone-200)' }}></div>
            <div className="mb-12">
              <div className="border-l-4 pl-6 mb-6" style={{ borderColor: 'var(--slate-600)' }}>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                  Research Sources
                </h2>
              </div>
              <div className="space-y-4">
                {researchSources.map((source: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border" style={{ background: 'var(--slate-50)', borderColor: 'var(--stone-200)' }}>
                    <p className="font-semibold text-lg" style={{ color: 'var(--slate-900)' }}>
                      {source.title}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--slate-700)' }}>
                      by {source.author} {source.authorCredentials && `(${source.authorCredentials})`}
                    </p>
                    {source.relevance && (
                      <p className="text-sm mt-2 italic" style={{ color: 'var(--slate-600)' }}>
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
