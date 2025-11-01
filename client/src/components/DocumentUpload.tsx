import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Loader2, Type } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUploadSuccess?: (documentId: string) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (data) => {
      toast.success('Document uploaded successfully!');
      setFile(null);
      setTextContent('');
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

  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    setUploading(true);

    try {
      // Convert text to base64
      const base64Data = btoa(unescape(encodeURIComponent(textContent)));
      const filename = `text-${Date.now()}.txt`;
      const fileSize = new Blob([textContent]).size;

      await uploadMutation.mutateAsync({
        filename,
        fileData: base64Data,
        fileSize,
      });

      setUploading(false);
    } catch (error) {
      toast.error('Failed to upload text');
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
          Upload a file or paste text to generate a Jonathan's Jots-style summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-input">Paste or Type Your Text</Label>
              <Textarea
                id="text-input"
                placeholder="Paste your text here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                disabled={uploading}
                rows={10}
                className="resize-y min-h-[200px]"
              />
              {textContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Type className="h-4 w-4" />
                  <span>{textContent.length} characters</span>
                  <span className="text-xs">({(textContent.length / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleTextUpload}
              disabled={!textContent.trim() || uploading}
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
              <p>• No file size limit for text input</p>
              <p>• Text will be processed immediately</p>
              <p>• Processing may take 1-2 minutes</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

