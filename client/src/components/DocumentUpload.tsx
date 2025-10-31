import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, Loader2, Upload, Maximize2, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUploadSuccess?: (documentId: string) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (data) => {
      toast.success('Document uploaded successfully!');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess?.(data.documentId);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload document');
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['.pdf', '.docx', '.txt', '.rtf'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload .pdf, .docx, .txt, or .rtf files.');
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:*/*;base64, prefix

        await uploadMutation.mutateAsync({
          filename: file.name,
          fileData: base64Data,
          fileSize: file.size,
        });

        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload file');
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="border-b border-[var(--jots-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[var(--jots-background)] flex items-center justify-center flex-shrink-0">
            <Upload className="h-6 w-6 text-[var(--jots-accent-primary)]" strokeWidth={2} />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">Upload Document</CardTitle>
            <CardDescription className="text-sm">
              Start by uploading your document
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-[var(--jots-accent-primary)] bg-white scale-[1.01]'
              : 'border-[var(--jots-border)] bg-[var(--jots-background)] hover:border-[var(--jots-accent-light)] hover:bg-white'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!uploading ? handleZoneClick : undefined}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white shadow-md flex items-center justify-center">
            <UploadCloud className="h-8 w-8 text-[var(--jots-accent-primary)]" strokeWidth={2} />
          </div>
          <div className="text-base font-semibold text-[var(--jots-text-primary)] mb-1">
            Drag & drop your file here
          </div>
          <div className="text-sm text-[var(--jots-text-secondary)] mb-6">
            or click to browse from your computer
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.rtf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />

          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="bg-[var(--jots-accent-primary)] hover:bg-[var(--jots-accent-hover)] text-white font-semibold shadow-sm hover:shadow-md transition-all"
            size="lg"
          >
            Choose File
          </Button>

          <div className="mt-6 pt-6 border-t border-[var(--jots-border)] flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--jots-text-secondary)]">
              <Maximize2 className="h-4 w-4 text-[var(--jots-accent-light)]" strokeWidth={2} />
              <span>Max 10MB</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--jots-text-secondary)]">
              <FileText className="h-4 w-4 text-[var(--jots-accent-light)]" strokeWidth={2} />
              <span>PDF, DOCX, TXT, RTF</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--jots-text-secondary)]">
              <Clock className="h-4 w-4 text-[var(--jots-accent-light)]" strokeWidth={2} />
              <span>~2-5 min processing</span>
            </div>
          </div>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-[var(--jots-background)] rounded-lg border border-[var(--jots-border)]">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[var(--jots-accent-primary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[var(--jots-text-primary)] truncate">
                  {file.name}
                </p>
                <p className="text-xs text-[var(--jots-text-secondary)]">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              {!uploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-shrink-0"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        )}

        {file && !uploading && (
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-4 bg-[var(--jots-accent-primary)] hover:bg-[var(--jots-accent-hover)] text-white font-semibold py-6 rounded-md transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            size="lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload & Process
          </Button>
        )}

        {uploading && (
          <div className="mt-4 p-4 bg-[var(--jots-background)] rounded-lg border border-[var(--jots-border)]">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--jots-accent-primary)] flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--jots-text-primary)]">
                  Uploading and processing...
                </p>
                <p className="text-xs text-[var(--jots-text-secondary)]">
                  This may take a minute
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
