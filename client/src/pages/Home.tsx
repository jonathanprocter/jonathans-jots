import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { DocumentUpload } from '@/components/DocumentUpload';
import { JotsLogo } from '@/components/JotsLogo';
import { LiveSummaryPreview } from '@/components/LiveSummaryPreview';
import JotsSummaryRenderer from "@/components/JotsSummaryRenderer";
import { FileText, Loader2, BookOpen, Eye, Upload, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const { user, loading } = useAuth();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [viewingSummaryId, setViewingSummaryId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');

  const utils = trpc.useUtils();

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = trpc.documents.list.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Fetch summaries
  const { data: summaries, isLoading: summariesLoading } = trpc.summaries.list.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Fetch specific summary for viewing
  const { data: viewingSummary } = trpc.summaries.get.useQuery(
    { summaryId: viewingSummaryId! },
    { enabled: !!viewingSummaryId }
  );

  // Generate summary mutation
  const generateSummaryMutation = trpc.summaries.generate.useMutation({
    onSuccess: (data) => {
      toast.success('Summary generation started!');
      utils.summaries.list.invalidate();
      setSelectedDocumentId(null);
      setBookTitle('');
      setBookAuthor('');
      // Navigate to the newly created summary
      if (data.summaryId) {
        setViewingSummaryId(data.summaryId);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate summary');
    },
  });

  const handleGenerateSummary = () => {
    if (!selectedDocumentId) {
      toast.error('Please select a document first');
      return;
    }

    generateSummaryMutation.mutate({
      documentId: selectedDocumentId,
      bookTitle: bookTitle || undefined,
      bookAuthor: bookAuthor || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-[var(--jots-accent-primary)]">Completed</Badge>;
      case 'processing':
      case 'generating':
        return <Badge variant="secondary">Processing...</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--jots-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--jots-accent-primary)]" />
      </div>
    );
  }

  // If viewing a summary, show appropriate view
  if (viewingSummary) {
    if (viewingSummary.status === 'generating') {
      return (
        <LiveSummaryPreview
          summaryId={viewingSummary.id}
          onComplete={() => {
            utils.summaries.get.invalidate({ summaryId: viewingSummary.id });
          }}
          onBack={() => setViewingSummaryId(null)}
        />
      );
    }

    if (viewingSummary.status === 'completed') {
    return (
      <div>
        <div className="border-b border-[var(--jots-border)] bg-white sticky top-0 z-10 shadow-sm">
          <div className="container py-4 flex items-center justify-between">
            <JotsLogo />
            <Button onClick={() => setViewingSummaryId(null)} variant="outline">
              ← Back to Dashboard
            </Button>
          </div>
        </div>
        <JotsSummaryRenderer summary={viewingSummary} />
      </div>
    );
    }
  }

  // Calculate stats
  const completedDocuments = documents?.filter(d => d.status === 'completed').length || 0;
  const completedSummaries = summaries?.filter(s => s.status === 'completed').length || 0;
  const avgProcessingTime = '~3m'; // This could be calculated from actual data

  return (
    <div className="min-h-screen flex flex-col bg-[var(--jots-background)]">
      {/* Header */}
      <header className="jots-header sticky top-0 z-50 shadow-sm">
        <div className="container py-3 sm:py-4 flex items-center justify-between">
          <JotsLogo />
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-[var(--jots-text-secondary)] hidden sm:inline">
              Jonathan's Jots
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container py-6 sm:py-8 md:py-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="mb-8 sm:mb-10 md:mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--jots-text-primary)] mb-3 sm:mb-4 tracking-tight">
              Transform Documents into Insights
            </h1>
            <p className="text-base sm:text-lg text-[var(--jots-text-secondary)] max-w-2xl mx-auto">
              Upload documents and generate premium research-backed summaries with deep analysis in minutes
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12">
            <Card className="hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[var(--jots-stat-1)] flex items-center justify-center flex-shrink-0">
                    <FileText className="h-7 w-7 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[var(--jots-text-primary)] tracking-tight">
                      {documentsLoading ? '...' : completedDocuments}
                    </h3>
                    <p className="text-sm font-medium text-[var(--jots-text-secondary)]">
                      Documents Uploaded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[var(--jots-stat-2)] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-7 w-7 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[var(--jots-text-primary)] tracking-tight">
                      {summariesLoading ? '...' : completedSummaries}
                    </h3>
                    <p className="text-sm font-medium text-[var(--jots-text-secondary)]">
                      Summaries Created
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[var(--jots-stat-3)] flex items-center justify-center flex-shrink-0">
                    <Clock className="h-7 w-7 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-[var(--jots-text-primary)] tracking-tight">
                      {avgProcessingTime}
                    </h3>
                    <p className="text-sm font-medium text-[var(--jots-text-secondary)]">
                      Avg. Processing Time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid - Upload and Generate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 sm:mb-12">
            <DocumentUpload
              onUploadSuccess={(docId) => {
                setSelectedDocumentId(docId);
                utils.documents.list.invalidate();
              }}
            />

            <Card className="hover:shadow-md transition-all">
              <CardHeader className="border-b border-[var(--jots-border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--jots-background)] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-[var(--jots-accent-primary)]" strokeWidth={2} />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Generate Summary</CardTitle>
                    <CardDescription className="text-sm">
                      Create your AI-powered summary
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-select" className="text-sm font-semibold">
                    Select Document <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="document-select"
                    className="w-full p-3 border border-[var(--jots-border)] rounded-md bg-white text-[var(--jots-text-primary)] focus:ring-2 focus:ring-[var(--jots-accent-primary)] focus:border-transparent transition-all"
                    value={selectedDocumentId || ''}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                    disabled={!documents || documents.length === 0}
                  >
                    <option value="">-- Select a processed document --</option>
                    {documents
                      ?.filter((doc) => doc.status === 'completed')
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.originalFilename}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="book-title" className="text-sm font-semibold">
                    Book Title (Optional)
                  </Label>
                  <Input
                    id="book-title"
                    placeholder="e.g., The Antidote"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="focus:ring-2 focus:ring-[var(--jots-accent-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="book-author" className="text-sm font-semibold">
                    Book Author (Optional)
                  </Label>
                  <Input
                    id="book-author"
                    placeholder="e.g., Oliver Burkeman"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="focus:ring-2 focus:ring-[var(--jots-accent-primary)]"
                  />
                </div>

                <Button
                  onClick={handleGenerateSummary}
                  disabled={!selectedDocumentId || generateSummaryMutation.isPending}
                  className="w-full bg-[var(--jots-accent-primary)] hover:bg-[var(--jots-accent-hover)] text-white font-semibold py-6 rounded-md transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  size="lg"
                >
                  {generateSummaryMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-5 w-5" />
                      Generate Summary
                    </>
                  )}
                </Button>

                <div className="bg-[var(--jots-background)] rounded-md p-4 border border-[var(--jots-border)]">
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--jots-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--jots-accent-primary)] font-bold mt-0.5">•</span>
                      <span>Summary generation takes 2-5 minutes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--jots-accent-primary)] font-bold mt-0.5">•</span>
                      <span>AI researches 5-10 related sources</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--jots-accent-primary)] font-bold mt-0.5">•</span>
                      <span>Includes comparative analysis & expert insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--jots-accent-primary)] font-bold mt-0.5">•</span>
                      <span>Export to PDF, Markdown, or DOCX</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Summaries */}
          <div className="mt-10 sm:mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--jots-text-primary)] tracking-tight">
                Recent Summaries
              </h2>
            </div>

            {summariesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--jots-accent-primary)]" />
              </div>
            ) : !summaries || summaries.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-[var(--jots-accent-light)]" />
                  <p className="text-[var(--jots-text-secondary)]">
                    No summaries generated yet. Create your first summary above!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {summaries.map((summary) => (
                  <Card
                    key={summary.id}
                    className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                    onClick={() => summary.status === 'completed' && setViewingSummaryId(summary.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-lg bg-[var(--jots-accent-primary)] flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-xs font-medium text-[var(--jots-accent-light)]">
                          {new Date(summary.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-[var(--jots-text-primary)] mb-1 tracking-tight">
                        {summary.bookTitle || 'Untitled Summary'}
                      </h3>
                      <p className="text-sm text-[var(--jots-text-secondary)] mb-4">
                        {summary.bookAuthor || 'Unknown Author'}
                      </p>
                      <div className="flex items-center gap-3 pt-4 border-t border-[var(--jots-border)] flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--jots-text-secondary)]">
                          <FileText className="h-3.5 w-3.5 text-[var(--jots-accent-light)]" strokeWidth={2} />
                          <span>20+ pages</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--jots-text-secondary)]">
                          <Clock className="h-3.5 w-3.5 text-[var(--jots-accent-light)]" strokeWidth={2} />
                          <span>15 min read</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--jots-text-secondary)]">
                          <BookOpen className="h-3.5 w-3.5 text-[var(--jots-accent-light)]" strokeWidth={2} />
                          <span>{summary.researchSourcesCount || 0} sources</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        {getStatusBadge(summary.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
