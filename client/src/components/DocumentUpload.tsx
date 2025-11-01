import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUploadSuccess?: (documentId: string) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (data) => {
      toast.success('Document uploaded successfully!', {
        description: 'Your document is now being processed. This may take 1-2 minutes.',
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploading(false);
      onUploadSuccess?.(data.documentId);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      const errorMessage = error.message || 'Failed to upload document';
      
      // Provide more specific error messages
      if (errorMessage.includes('file type')) {
        toast.error('Invalid file type', {
          description: 'Please upload a PDF, DOCX, TXT, or RTF file.',
        });
      } else if (errorMessage.includes('size')) {
        toast.error('File too large', {
          description: 'Please upload a file smaller than 10MB.',
        });
      } else if (errorMessage.includes('base64') || errorMessage.includes('file data')) {
        toast.error('File read error', {
          description: 'Failed to read the file. Please try again.',
        });
      } else {
        toast.error('Upload failed', {
          description: errorMessage,
        });
      }
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
    }
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
        try {
          const base64 = reader.result as string;
          if (!base64 || base64.length === 0) {
            throw new Error('Failed to read file data');
          }

          const base64Data = base64.split(',')[1]; // Remove data:*/*;base64, prefix
          
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Invalid file data format');
          }

          console.log(`Uploading file: ${file.name}, size: ${file.size} bytes, base64 length: ${base64Data.length}`);

          await uploadMutation.mutateAsync({
            filename: file.name,
            fileData: base64Data,
            fileSize: file.size,
          });

          // Note: setUploading(false) is now handled in onSuccess/onError
        } catch (error) {
          console.error('Upload error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Upload failed', {
            description: errorMsg,
          });
          setUploading(false);
        }
      };
      reader.onerror = (error) => {
        console.error('File reader error:', error);
        toast.error('Failed to read file', {
          description: 'There was an error reading the file. Please try again.',
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload preparation error:', error);
      toast.error('Failed to prepare file for upload');
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
        <CardDescription>
          Upload a .pdf, .docx, .txt, or .rtf file to generate a Jonathan's Jots-style summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.rtf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
              <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Maximum file size: 10MB</p>
          <p>• Supported formats: PDF, DOCX, TXT, RTF</p>
          <p>• Processing may take 1-2 minutes</p>
        </div>
      </CardContent>
    </Card>
  );
}

