import { nanoid } from "nanoid";
import { createDocument, updateDocumentStatus } from "./db";
import { storagePut } from "./storage";
import {
  processDocument,
  getFileType,
  validateFileSize,
  DocumentType,
} from "./documentProcessor";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export type UploadDocumentParams = {
  filename: string;
  buffer: Buffer;
  fileSize: number;
  userId: string;
};

export type UploadDocumentResult = {
  documentId: string;
  storageKey: string;
  storageUrl: string;
  fileType: DocumentType;
};

const MIME_TYPES: Record<DocumentType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  rtf: "application/rtf",
};

export function getMimeType(fileType: DocumentType | string): string {
  if (fileType in MIME_TYPES) {
    return MIME_TYPES[fileType as DocumentType];
  }
  return "application/octet-stream";
}

export async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  fileType: DocumentType,
): Promise<void> {
  await updateDocumentStatus(documentId, "processing");

  const result = await processDocument(buffer, fileType);

  if (!result.success) {
    throw new Error(result.error || "Document processing failed");
  }

  await updateDocumentStatus(documentId, "completed", result.text);
}

export async function handleDocumentUpload(
  params: UploadDocumentParams,
): Promise<UploadDocumentResult> {
  const { filename, buffer, fileSize } = params;
  const userId = params.userId || "anonymous";

  const fileType = getFileType(filename);
  if (!fileType) {
    throw new Error("Unsupported file type. Please upload .pdf, .docx, .txt, or .rtf files.");
  }

  if (!validateFileSize(fileSize)) {
    throw new Error("File size exceeds 10MB limit.");
  }

  const storageKey = `documents/${userId}/${nanoid()}-${filename}`;
  const { url: storageUrl } = await storagePut(storageKey, buffer, getMimeType(fileType));

  const documentId = nanoid();
  const document = await createDocument({
    id: documentId,
    userId,
    originalFilename: filename,
    fileType,
    fileSize,
    storageKey,
    storageUrl,
    status: "uploaded",
  });

  processDocumentAsync(documentId, buffer, fileType).catch(async error => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Document processing failed:", message);
    try {
      await updateDocumentStatus(documentId, "failed", undefined, message);
    } catch (updateError) {
      console.error("Failed to update document status after processing error:", updateError);
    }
  });

  return {
    documentId: document.id,
    storageKey,
    storageUrl,
    fileType,
  };
}
