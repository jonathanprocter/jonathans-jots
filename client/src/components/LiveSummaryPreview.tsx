import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import JotsSummaryRenderer from "./JotsSummaryRenderer";
import { GeneratingLoader } from "./GeneratingLoader";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface LiveSummaryPreviewProps {
  summaryId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function LiveSummaryPreview({
  summaryId,
  onComplete,
  onBack,
}: LiveSummaryPreviewProps) {
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
    if (summary?.status === "completed") {
      setIsGenerating(false);
      onComplete();
    } else if (summary?.status === "failed") {
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
        <div className="container py-3 sm:py-4 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="text-sm sm:text-base"
            >
              ← Back
            </Button>
            {isGenerating && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex-1">
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-medium text-[#2E4057]">
                      {progress?.stage || "Generating..."}
                    </span>
                    {progress?.currentSection && (
                      <span className="text-xs text-gray-500">
                        {progress.currentSection}
                      </span>
                    )}
                  </div>
                  <div className="w-full sm:w-48 mt-2">
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {progress?.sectionsCompleted || 0} /{" "}
                  {progress?.totalSections || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-4 sm:py-8 px-4">
        {!summary || summary.status === "generating" ? (
          <div>
            {progress?.partialContent ? (
              // Show partial content as it's being generated
              <div>
                <JotsSummaryRenderer
                  summary={{
                    ...summary,
                    bookTitle:
                      progress.partialContent.bookTitle || "Generating...",
                    bookAuthor:
                      progress.partialContent.bookAuthor || "Generating...",
                    introduction: progress.partialContent.introduction || "",
                    onePageSummary:
                      progress.partialContent.onePageSummary || "",
                    mainContent: JSON.stringify({
                      sections: progress.partialContent.sections || [],
                      researchSources:
                        progress.partialContent.researchSources || [],
                    }),
                  }}
                />
                {/* Live generation indicator */}
                <div className="mt-12 mb-8">
                  <div className="jots-bar animate-pulse"></div>
                  <div className="text-center mt-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#2E4057] to-[#D4772E] text-white rounded-lg shadow-lg">
                      <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></div>
                      <div className="text-left">
                        <div className="font-semibold">
                          Researching and writing...
                        </div>
                        <div className="text-xs opacity-90">
                          Adding Jots Notes with external sources
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <GeneratingLoader stage={progress?.stage || "Initializing..."} />
            )}
          </div>
        ) : summary.status === "completed" ? (
          <JotsSummaryRenderer summary={summary} />
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
