import { JotsLogo } from './JotsLogo';

interface JotsNote {
  type: 'shortform_note';
  noteType: 'comparison' | 'context' | 'critique' | 'practical' | 'general';
  sourceBook?: string;
  sourceAuthor?: string;
  text: string;
}

interface ContentItem {
  type: 'paragraph' | 'shortform_note' | 'subsection' | 'example' | 'list';
  text?: string;
  title?: string;
  content?: string | ContentItem[];
  items?: string[];
  noteType?: string;
  sourceBook?: string;
  sourceAuthor?: string;
}

interface Section {
  title: string;
  content: ContentItem[];
}

interface JotsSummaryProps {
  bookTitle: string;
  bookAuthor: string;
  introduction: string;
  onePageSummary: string;
  mainContent: string; // JSON stringified sections
}

export function JotsSummaryRenderer({
  bookTitle,
  bookAuthor,
  introduction,
  onePageSummary,
  mainContent,
}: JotsSummaryProps) {
  let sections: Section[] = [];
  try {
    sections = JSON.parse(mainContent);
  } catch (error) {
    console.error('Failed to parse main content:', error);
  }

  const renderContentItem = (item: ContentItem, index: number) => {
    switch (item.type) {
      case 'paragraph':
        return (
          <p key={index} className="jots-paragraph">
            {renderTextWithFormatting(item.text || '')}
          </p>
        );

      case 'shortform_note':
        return (
          <div
            key={index}
            className="jots-note"
            data-research-type={item.noteType || 'general'}
          >
            <div className="jots-note-title">
              {getJotsNoteIcon(item.noteType || 'general')}{' '}
              {getJotsNoteTitle(item)}
            </div>
            <div className="jots-note-content">
              {renderTextWithFormatting(item.text || '')}
            </div>
          </div>
        );

      case 'subsection':
        return (
          <div key={index}>
            <h4 className="jots-subsection-title">{item.title}</h4>
            {typeof item.content === 'string' ? (
              <p className="jots-paragraph">{renderTextWithFormatting(item.content)}</p>
            ) : Array.isArray(item.content) ? (
              item.content.map((subItem, subIndex) => renderContentItem(subItem, subIndex))
            ) : null}
          </div>
        );

      case 'example':
        return (
          <div key={index} className="jots-example">
            <div className="jots-example-label">Example:</div>
            <p>{renderTextWithFormatting(item.text || '')}</p>
          </div>
        );

      case 'list':
        return (
          <ul key={index} className="jots-list">
            {item.items?.map((listItem, listIndex) => (
              <li key={listIndex}>{renderTextWithFormatting(listItem)}</li>
            ))}
          </ul>
        );

      default:
        return null;
    }
  };

  const renderTextWithFormatting = (text: string) => {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert _italic_ to <em>
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');

    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  const getJotsNoteIcon = (noteType: string) => {
    switch (noteType) {
      case 'comparison':
        return '⚖️';
      case 'context':
        return '📚';
      case 'critique':
        return '🤔';
      case 'practical':
        return '🎯';
      default:
        return '💡';
    }
  };

  const getJotsNoteTitle = (item: ContentItem) => {
    if (item.sourceBook && item.sourceAuthor) {
      return `Perspective from ${item.sourceAuthor}'s ${item.sourceBook}`;
    }

    switch (item.noteType) {
      case 'comparison':
        return 'Comparative Perspective';
      case 'context':
        return 'Background & Context';
      case 'critique':
        return 'Critical Analysis';
      case 'practical':
        return 'Practical Application';
      default:
        return 'Jots Note';
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container py-4">
          <JotsLogo />
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 max-w-4xl">
        {/* Title Page */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Summary of {bookTitle}</h1>
          <h2 className="text-2xl text-gray-700 mb-6">Original book by {bookAuthor}</h2>
          <div className="prose prose-lg">
            <p>{introduction}</p>
          </div>
        </div>

        {/* Yellow Bar */}
        <div className="jots-yellow-bar"></div>

        {/* 1-Page Summary */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">1-Page Summary</h2>
          <div className="prose prose-lg">
            <p className="jots-paragraph">{onePageSummary}</p>
          </div>
        </div>

        {/* Yellow Bar */}
        <div className="jots-yellow-bar"></div>

        {/* Main Content Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-12">
            <h2 className="jots-section-title">{section.title}</h2>
            <div>
              {section.content.map((item, itemIndex) =>
                renderContentItem(item, itemIndex)
              )}
            </div>
            {sectionIndex < sections.length - 1 && (
              <div className="jots-yellow-bar"></div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-600">
          <p>
            This document is a Jots-style summary generated by the Jots Summary
            Generator.
          </p>
        </div>
      </div>
    </div>
  );
}

