import { nanoid } from "nanoid";
import {
  createDocument,
  updateDocumentStatus,
  type Document,
} from "./db";
import { storagePut } from "./storage";
import {
  processDocument,
  getFileType,
  validateFileSize,
  type DocumentType,
} from "./documentProcessor";

export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "txt", "rtf"] as const;

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  rtf: "application/rtf",
};

export function getMimeType(fileExtensionOrType: string): string {
  const normalized = (fileExtensionOrType || "").toLowerCase();

  if (normalized in MIME_TYPES) {
    return MIME_TYPES[normalized];
  }

  const ext = normalized.includes(".")
    ? normalized.split(".").pop() ?? ""
    : normalized;

  return MIME_TYPES[ext] ?? "application/octet-stream";
}

type UploadDocumentParams = {
  filename: string;
  fileSize: number;
  buffer: Buffer;
  userId: string;
};

export type UploadDocumentResult = {
  success: true;
  documentId: string;
  message: string;
  document: Document;
};

export async function handleDocumentUpload({
  filename,
  fileSize,
  buffer,
  userId,
}: UploadDocumentParams): Promise<UploadDocumentResult> {
  const fileType = getFileType(filename);
  if (!fileType) {
    throw new Error(
      "Unsupported file type. Please upload .pdf, .docx, .txt, or .rtf files."
    );
  }

  if (!validateFileSize(fileSize)) {
    throw new Error("File size exceeds 10MB limit.");
  }

  const storageKey = `documents/${userId}/${nanoid()}-${filename}`;
  const { url: storageUrl } = await storagePut(
    storageKey,
    buffer,
    getMimeType(fileType)
  );

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

  processDocumentAsync(documentId, buffer, fileType).catch(async (error) => {
    const message =
      error instanceof Error ? error.message : "Unknown document processing error";
    console.error("Document processing failed:", message);
    try {
      await updateDocumentStatus(documentId, "failed", undefined, message);
    } catch (updateError) {
      console.error(
        "Failed to update document status after processing error:",
        updateError
      );
    }
  });

  return {
    success: true,
    documentId,
    message: "Document uploaded successfully. Processing has started.",
    document,
  } as const;
}

async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  fileType: DocumentType
): Promise<void> {
  await updateDocumentStatus(documentId, "processing");

  const result = await processDocument(buffer, fileType);

  if (!result.success) {
    throw new Error(result.error || "Document processing failed");
  }

  await updateDocumentStatus(documentId, "completed", result.text);
}

