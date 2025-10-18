// Summary data type matches database schema
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

  // Helper to render Jonathan's Jots notes (inline, blue text)
  const renderJotsNote = (note: any) => {
    return (
      <p className="mb-4 leading-relaxed">
        <span className="text-blue-600">
          (Jonathan's Jots note: {renderFormattedText(note.content)}
          {note.sources && note.sources.length > 0 && (
            <span>
              {" "}According to{" "}
              {note.sources.map((source: any, i: number) => (
                <span key={i}>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {source.title}
                  </a>
                  {i < note.sources.length - 1 && ", "}
                </span>
              ))}
            </span>
          )}
          )
        </span>
      </p>
    );
  };

  // Helper to render content items (paragraphs, lists, notes)
  const renderContentItem = (item: any, index: number) => {
    if (item.type === "paragraph") {
      return <div key={index}>{renderParagraph(item.text)}</div>;
    } else if (item.type === "list") {
      return (
        <ul key={index} className="list-disc list-inside mb-4 space-y-2">
          {item.items.map((listItem: string, i: number) => (
            <li key={i} className="leading-relaxed">
              {renderFormattedText(listItem)}
            </li>
          ))}
        </ul>
      );
    } else if (item.type === "shortform_note") {
      return <div key={index}>{renderJotsNote(item)}</div>;
    } else if (item.type === "subsection") {
      return (
        <div key={index} className="mb-8">
          <h3 className="text-xl font-semibold text-[#2E4057] mb-4 mt-6">
            {item.title}
          </h3>
          {item.content.map((subItem: any, subIndex: number) =>
            renderContentItem(subItem, subIndex)
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Content */}
      <div className="container py-4 sm:py-8 max-w-4xl px-4">
        {/* Professional Cover Page */}
        <div className="bg-gradient-to-br from-white to-[#F4E4D7] p-6 sm:p-12 rounded-lg shadow-lg mb-8 sm:mb-12 min-h-[300px] sm:min-h-[400px] flex flex-col justify-between">
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2E4057] mb-3 sm:mb-4 leading-tight">
              Summary of {bookTitle}
            </h1>
            <h2 className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8">
              Original book by {bookAuthor}
            </h2>
            
            {/* Introduction paragraphs on cover */}
            {introduction && (
              <div className="text-base sm:text-lg text-gray-700 space-y-4">
                {introduction.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{renderFormattedText(para)}</p>
                ))}
              </div>
            )}
          </div>
          
          {/* Logo in bottom right corner */}
          <div className="flex justify-end items-end mt-8">
            <div className="text-right">
              <img 
                src="/jots-logo.svg" 
                alt="Jonathan's Jots" 
                className="h-12 sm:h-16 w-auto opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Cognac Bar */}
        <div className="h-1 bg-[#D4772E] my-8 sm:my-12"></div>

        {/* 1-Page Summary */}
        {onePageSummary && (
          <div className="mb-8 sm:mb-12">
            <div className="bg-[#FFF9E6] border-l-4 border-[#D4772E] p-6 sm:p-8 mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2E4057] mb-4 sm:mb-6">
                1-Page Summary
              </h2>
              <div className="text-base sm:text-lg text-gray-800 space-y-4">
                {onePageSummary.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="leading-relaxed">{renderFormattedText(para)}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cognac Bar */}
        {sections.length > 0 && (
          <div className="h-1 bg-[#D4772E] my-8 sm:my-12"></div>
        )}

        {/* Main Content Sections */}
        {sections.map((section: any, sectionIndex: number) => (
          <div key={sectionIndex} className="mb-8 sm:mb-12">
            {/* Section with cognac bar above */}
            {sectionIndex > 0 && (
              <div className="h-1 bg-[#D4772E] my-8 sm:my-12"></div>
            )}
            
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2E4057] mb-6 sm:mb-8">
              {section.title}
            </h2>
            
            <div className="text-base sm:text-lg text-gray-800">
              {section.content.map((item: any, itemIndex: number) =>
                renderContentItem(item, itemIndex)
              )}
            </div>
          </div>
        ))}

        {/* Research Sources Section */}
        {researchSources && researchSources.length > 0 && (
          <>
            <div className="h-1 bg-[#D4772E] my-8 sm:my-12"></div>
            <div className="mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2E4057] mb-6">
                Research Sources
              </h2>
              <div className="space-y-4">
                {researchSources.map((source: any, i: number) => (
                  <div key={i} className="border-l-2 border-gray-300 pl-4">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      {source.title}
                    </a>
                    {source.author && (
                      <p className="text-sm text-gray-600 mt-1">by {source.author}</p>
                    )}
                    {source.relevance && (
                      <p className="text-sm text-gray-700 mt-2">{source.relevance}</p>
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

