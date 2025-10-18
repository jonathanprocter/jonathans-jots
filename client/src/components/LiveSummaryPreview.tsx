import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { JotsSummaryRenderer } from './JotsSummaryRenderer';
import { GeneratingLoader } from './GeneratingLoader';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface LiveSummaryPreviewProps {
  summaryId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function LiveSummaryPreview({ summaryId, onComplete, onBack }: LiveSummaryPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  
  // Poll for progress updates
  const { data: progress } = trpc.summaries.progress.useQuery(
    { summaryId },
    {
      enabled: isGenerating,
      refetchInterval: 1000, // Poll every second
    }
  );

  // Poll for summary data
  const { data: summary, refetch } = trpc.summaries.get.useQuery(
    { summaryId },
    {
      enabled: true,
      refetchInterval: isGenerating ? 2000 : false, // Poll every 2 seconds while generating
    }
  );

  useEffect(() => {
    if (summary?.status === 'completed') {
      setIsGenerating(false);
      onComplete();
    } else if (summary?.status === 'failed') {
      setIsGenerating(false);
    }
  }, [summary?.status, onComplete]);

  const progressPercentage = progress?.totalSections 
    ? (progress.sectionsCompleted / progress.totalSections) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-4 border-[#D4772E] bg-white sticky top-0 z-10 shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline">
              ← Back to Dashboard
            </Button>
            {isGenerating && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#2E4057]">
                    {progress?.stage || 'Generating...'}
                  </span>
                  {progress?.currentSection && (
                    <span className="text-xs text-gray-500">
                      {progress.currentSection}
                    </span>
                  )}
                </div>
                <div className="w-48">
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                <span className="text-xs text-gray-500">
                  {progress?.sectionsCompleted || 0} / {progress?.totalSections || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {!summary || summary.status === 'generating' ? (
          <div>
            {progress?.partialContent ? (
              // Show partial content as it's being generated
              <div className="opacity-90">
                <JotsSummaryRenderer
                  bookTitle={progress.partialContent.bookTitle || 'Generating...'}
                  bookAuthor={progress.partialContent.bookAuthor || 'Generating...'}
                  introduction={progress.partialContent.introduction || ''}
                  onePageSummary={progress.partialContent.onePageSummary || ''}
                  mainContent={JSON.stringify(progress.partialContent.sections || [])}
                />
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4772E]/10 rounded-full">
                    <div className="animate-spin h-4 w-4 border-2 border-[#D4772E] border-t-transparent rounded-full"></div>
                    <span className="text-sm text-[#2E4057]">
                      Generating more content...
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <GeneratingLoader stage={progress?.stage || 'Initializing...'} />
            )}
          </div>
        ) : summary.status === 'completed' ? (
          <JotsSummaryRenderer
            bookTitle={summary.bookTitle || 'Untitled'}
            bookAuthor={summary.bookAuthor || 'Unknown Author'}
            introduction={summary.introduction || ''}
            onePageSummary={summary.onePageSummary || ''}
            mainContent={summary.mainContent || '[]'}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">Summary generation failed</p>
            <Button onClick={onBack}>Back to Dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}

