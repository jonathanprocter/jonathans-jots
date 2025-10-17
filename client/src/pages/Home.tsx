import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ShortformLogo } from '@/components/ShortformLogo';
import { ShortformSummaryRenderer } from '@/components/ShortformSummaryRenderer';
import { FileText, Loader2, BookOpen, RefreshCw, Eye } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If viewing a summary, show the full summary renderer
  if (viewingSummary && viewingSummary.status === 'completed') {
    return (
      <div>
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="container py-4 flex items-center justify-between">
            <ShortformLogo />
            <Button onClick={() => setViewingSummaryId(null)} variant="outline">
              ← Back to Dashboard
            </Button>
          </div>
        </div>
        <ShortformSummaryRenderer
          bookTitle={viewingSummary.bookTitle || 'Untitled'}
          bookAuthor={viewingSummary.bookAuthor || 'Unknown Author'}
          introduction={viewingSummary.introduction || ''}
          onePageSummary={viewingSummary.onePageSummary || ''}
          mainContent={viewingSummary.mainContent || '[]'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container py-4 flex items-center justify-between">
          <ShortformLogo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Shortform Summary Generator</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Shortform Summary Generator</h1>
            <p className="text-gray-600">
              Upload documents and generate premium Shortform-style summaries with deep research
            </p>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upload">Upload Document</TabsTrigger>
              <TabsTrigger value="documents">
                My Documents {documents && `(${documents.length})`}
              </TabsTrigger>
              <TabsTrigger value="summaries">
                My Summaries {summaries && `(${summaries.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <DocumentUpload
                  onUploadSuccess={(docId) => {
                    setSelectedDocumentId(docId);
                    utils.documents.list.invalidate();
                  }}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Generate Summary</CardTitle>
                    <CardDescription>
                      Select a processed document and provide book details to generate a summary
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Document</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={selectedDocumentId || ''}
                        onChange={(e) => setSelectedDocumentId(e.target.value)}
                        disabled={!documents || documents.length === 0}
                      >
                        <option value="">-- Select a document --</option>
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
                      <Label htmlFor="book-title">Book Title (Optional)</Label>
                      <Input
                        id="book-title"
                        placeholder="e.g., The Antidote"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="book-author">Book Author (Optional)</Label>
                      <Input
                        id="book-author"
                        placeholder="e.g., Oliver Burkeman"
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleGenerateSummary}
                      disabled={!selectedDocumentId || generateSummaryMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {generateSummaryMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Generate Summary
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Summary generation takes 2-5 minutes</p>
                      <p>• AI will research 5-10 related books and sources</p>
                      <p>• Includes comparative analysis and expert insights</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Documents</CardTitle>
                  <CardDescription>View and manage your uploaded documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !documents || documents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No documents uploaded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{doc.originalFilename}</p>
                              <p className="text-sm text-gray-500">
                                {doc.fileType.toUpperCase()} • {(doc.fileSize / 1024).toFixed(2)}{' '}
                                KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(doc.status)}
                            {doc.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDocumentId(doc.id)}
                              >
                                Use for Summary
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summaries">
              <Card>
                <CardHeader>
                  <CardTitle>Generated Summaries</CardTitle>
                  <CardDescription>View your Shortform-style summaries</CardDescription>
                </CardHeader>
                <CardContent>
                  {summariesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !summaries || summaries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No summaries generated yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {summaries.map((summary) => (
                        <div
                          key={summary.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 text-yellow-600" />
                            <div>
                              <p className="font-medium">
                                {summary.bookTitle || 'Untitled Summary'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {summary.bookAuthor || 'Unknown Author'} •{' '}
                                {summary.researchSourcesCount || 0} sources cited
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(summary.status)}
                            {summary.status === 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => setViewingSummaryId(summary.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Summary
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

