import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import JotsSummaryRenderer from "./JotsSummaryRenderer";
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
      {/* Header - Mobile Optimized */}
      <div className="border-b-4 border-[#D4772E] bg-white sticky top-0 z-10 shadow-sm">
        <div className="container py-2 sm:py-3 md:py-4 px-3 sm:px-4 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={onBack}
              variant="outline"
              className="text-xs sm:text-sm md:text-base px-3 sm:px-4 py-2 min-h-[36px] touch-manipulation"
            >
              ← Back
            </Button>
            {isGenerating && (
              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                {progress?.sectionsCompleted || 0} / {progress?.totalSections || 0} sections
              </span>
            )}
          </div>
          {isGenerating && (
            <div className="w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-[#2E4057] truncate flex-1">
                    {progress?.stage || 'Generating...'}
                  </span>
                  <span className="text-xs sm:text-sm text-[#D4772E] font-semibold ml-2">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                {progress?.currentSection && (
                  <span className="text-xs text-gray-500 truncate">
                    {progress.currentSection}
                  </span>
                )}
                <Progress value={progressPercentage} className="h-2 sm:h-2.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content - Mobile Optimized */}
      <div className="container py-3 sm:py-6 md:py-8 px-3 sm:px-4">
        {!summary || summary.status === 'generating' ? (
          <div>
            {progress?.partialContent ? (
              // Show partial content as it's being generated
              <div>
                <JotsSummaryRenderer
                  summary={{
                    ...summary,
                    bookTitle: progress.partialContent.bookTitle || 'Generating...',
                    bookAuthor: progress.partialContent.bookAuthor || 'Generating...',
                    introduction: progress.partialContent.introduction || '',
                    onePageSummary: progress.partialContent.onePageSummary || '',
                    mainContent: JSON.stringify({
                      sections: progress.partialContent.sections || [],
                      researchSources: progress.partialContent.researchSources || []
                    })
                  }}
                />
                {/* Live generation indicator - Mobile Optimized */}
                <div className="mt-8 sm:mt-12 mb-6 sm:mb-8">
                  <div className="h-1 bg-gradient-to-r from-transparent via-[#D4772E] to-transparent animate-pulse"></div>
                  <div className="text-center mt-6 sm:mt-8 px-3">
                    <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#2E4057] to-[#D4772E] text-white rounded-lg shadow-lg max-w-full">
                      <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 sm:border-3 border-white border-t-transparent rounded-full flex-shrink-0"></div>
                      <div className="text-left">
                        <div className="font-semibold text-sm sm:text-base">Researching and writing...</div>
                        <div className="text-xs opacity-90 hidden sm:block">Adding Jots Notes with external sources</div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm text-gray-600">
                      Creating comprehensive 20-page summary
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <GeneratingLoader stage={progress?.stage || 'Initializing...'} />
            )}
          </div>
        ) : summary.status === 'completed' ? (
          <JotsSummaryRenderer summary={summary} />
        ) : (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="max-w-md mx-auto">
              <p className="text-red-600 mb-4 text-sm sm:text-base">Summary generation failed</p>
              <p className="text-gray-600 mb-6 text-xs sm:text-sm">
                {summary?.errorMessage || 'An error occurred during generation. Please try again.'}
              </p>
              <Button
                onClick={onBack}
                className="min-h-[44px] px-6 text-sm sm:text-base touch-manipulation"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

