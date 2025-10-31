import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { DocumentUpload } from '@/components/DocumentUpload';
import { JotsLogo } from '@/components/JotsLogo';
import { LiveSummaryPreview } from '@/components/LiveSummaryPreview';
import JotsSummaryRenderer from "@/components/JotsSummaryRenderer";
import { Loader2, BookOpen } from 'lucide-react';
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
    onSuccess: () => {
      toast.success('Summary generation started!');
      utils.summaries.list.invalidate();
      setSelectedDocumentId(null);
      setBookTitle('');
      setBookAuthor('');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            // Refresh the summary data
            utils.summaries.get.invalidate({ summaryId: viewingSummary.id });
          }}
          onBack={() => setViewingSummaryId(null)}
        />
      );
    }
    
    if (viewingSummary.status === 'completed') {
    return (
      <div style={{ background: 'var(--stone-50)' }}>
        <div className="jots-header sticky top-0 z-10 shadow-sm">
          <div className="container max-w-7xl py-4 flex items-center justify-between">
            <JotsLogo />
            <button
              onClick={() => setViewingSummaryId(null)}
              className="px-4 py-2 rounded-md font-medium text-sm border transition-all hover:bg-stone-50"
              style={{ borderColor: 'var(--stone-300)', color: 'var(--slate-700)' }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        <JotsSummaryRenderer summary={viewingSummary} />
      </div>
    );
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--stone-50)' }}>
      <header className="jots-header sticky top-0 z-50 shadow-sm">
        <div className="container max-w-7xl py-4 flex items-center justify-between">
          <JotsLogo />
          <div className="flex items-center gap-1">
            <button className="px-3.5 py-2 text-sm font-medium rounded-md transition-all" style={{ color: 'var(--slate-900)', background: 'var(--stone-100)' }}>
              <span className="mr-2">🏠</span>
              Home
            </button>
            <button className="px-3.5 py-2 text-sm font-medium rounded-md transition-all hover:bg-stone-100" style={{ color: 'var(--slate-600)' }}>
              <span className="mr-2">📁</span>
              Documents
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-lg font-semibold" style={{ background: 'var(--slate-700)', color: 'white' }}>{documents?.length || 0}</span>
            </button>
            <button className="px-3.5 py-2 text-sm font-medium rounded-md transition-all hover:bg-stone-100" style={{ color: 'var(--slate-600)' }}>
              <span className="mr-2">📝</span>
              Summaries
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-lg font-semibold" style={{ background: 'var(--slate-700)', color: 'white' }}>{summaries?.length || 0}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl py-12 px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold mb-3" style={{ color: 'var(--slate-900)', letterSpacing: '-0.035em' }}>
            Transform Documents into Insights
          </h1>
          <p className="text-base max-w-2xl" style={{ color: 'var(--slate-600)' }}>
            Upload documents and generate premium research-backed summaries with deep analysis in minutes
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white rounded-xl p-5 border transition-all card-hover flex items-center gap-4" style={{ borderColor: 'var(--stone-200)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-600)' }}>
              📄
            </div>
            <div>
              <h3 className="text-3xl font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                {documents?.length || 0}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>
                Documents Uploaded
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border transition-all card-hover flex items-center gap-4" style={{ borderColor: 'var(--stone-200)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-700)' }}>
              ✨
            </div>
            <div>
              <h3 className="text-3xl font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                {summaries?.length || 0}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>
                Summaries Created
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border transition-all card-hover flex items-center gap-4" style={{ borderColor: 'var(--stone-200)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-600)' }}>
              ⚡
            </div>
            <div>
              <h3 className="text-3xl font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                ~3m
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>
                Avg. Processing Time
              </p>
            </div>
          </div>
        </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Upload Card */}
            <div className="bg-white rounded-xl p-7 border card-hover" style={{ borderColor: 'var(--stone-200)' }}>
              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b" style={{ borderColor: 'var(--stone-200)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-600)' }}>
                  📤
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.015em' }}>
                    Upload Document
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>
                    Start by uploading your document
                  </div>
                </div>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6">
                  <DocumentUpload
                    onUploadSuccess={(docId) => {
                      setSelectedDocumentId(docId);
                      utils.documents.list.invalidate();
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Generate Summary Card */}
            <div className="bg-white rounded-xl p-7 border card-hover" style={{ borderColor: 'var(--stone-200)' }}>
              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b" style={{ borderColor: 'var(--stone-200)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-700)' }}>
                  ✨
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.015em' }}>
                    Generate Summary
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--slate-500)' }}>
                    Create your AI-powered summary
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-700)', letterSpacing: '-0.005em' }}>
                    Select Document *
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 border rounded-md text-sm transition-all focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--stone-300)',
                      color: 'var(--slate-800)',
                      background: 'white'
                    }}
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
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-700)', letterSpacing: '-0.005em' }}>
                    Book Title (Optional)
                  </label>
                  <Input
                    id="book-title"
                    placeholder="e.g., The Antidote"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="px-3.5 py-2.5 text-sm"
                    style={{ borderColor: 'var(--stone-300)' }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-700)', letterSpacing: '-0.005em' }}>
                    Book Author (Optional)
                  </label>
                  <Input
                    id="book-author"
                    placeholder="e.g., Oliver Burkeman"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="px-3.5 py-2.5 text-sm"
                    style={{ borderColor: 'var(--stone-300)' }}
                  />
                </div>

                <button
                  onClick={handleGenerateSummary}
                  disabled={!selectedDocumentId || generateSummaryMutation.isPending}
                  className="w-full px-6 py-3 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'var(--slate-700)',
                    color: 'white',
                    letterSpacing: '-0.005em'
                  }}
                >
                  {generateSummaryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      Generate Summary
                    </>
                  )}
                </button>

                <div className="rounded-xl p-3.5 border text-sm space-y-1" style={{ background: 'var(--slate-50)', borderColor: 'var(--slate-200)', color: 'var(--slate-600)' }}>
                  <p>• Summary generation takes 2-5 minutes</p>
                  <p>• AI researches 5-10 related sources</p>
                  <p>• Includes comparative analysis & expert insights</p>
                  <p>• Export to PDF, Markdown, or DOCX</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Summaries Section */}
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold" style={{ color: 'var(--slate-900)', letterSpacing: '-0.025em' }}>
                Recent Summaries
              </h2>
              <a href="#" className="text-sm font-medium flex items-center gap-1.5 transition-all hover:gap-2" style={{ color: 'var(--slate-600)' }}>
                View All
                <span>→</span>
              </a>
            </div>

            {summariesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--slate-400)' }} />
              </div>
            ) : !summaries || summaries.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border text-center" style={{ borderColor: 'var(--stone-200)' }}>
                <p style={{ color: 'var(--slate-500)' }}>
                  No summaries generated yet. Upload a document and generate your first summary!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {summaries.slice(0, 6).map((summary) => (
                  <div
                    key={summary.id}
                    className="bg-white rounded-xl p-5 border card-hover cursor-pointer"
                    style={{ borderColor: 'var(--stone-200)' }}
                    onClick={() => setViewingSummaryId(summary.id)}
                  >
                    <div className="flex justify-between items-start mb-3.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--stone-100)', color: 'var(--slate-700)' }}>
                        📘
                      </div>
                      <div className="text-xs font-medium" style={{ color: 'var(--slate-400)' }}>
                        {summary.status === 'generating' ? 'Generating...' : summary.status === 'completed' ? 'Completed' : 'Processing'}
                      </div>
                    </div>
                    <div className="font-semibold mb-1 text-base" style={{ color: 'var(--slate-900)', letterSpacing: '-0.01em' }}>
                      {summary.bookTitle || 'Untitled Summary'}
                    </div>
                    <div className="text-sm mb-3.5" style={{ color: 'var(--slate-500)' }}>
                      {summary.bookAuthor || 'Unknown Author'}
                    </div>
                    <div className="flex gap-3.5 pt-3.5 border-t" style={{ borderColor: 'var(--stone-200)' }}>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate-500)' }}>
                        <span style={{ color: 'var(--slate-400)' }}>📄</span>
                        <span>~40 pages</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate-500)' }}>
                        <span style={{ color: 'var(--slate-400)' }}>📚</span>
                        <span>{summary.researchSourcesCount || 0} sources</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

