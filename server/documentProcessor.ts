import mammoth from 'mammoth';
import { Readable } from 'stream';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// @ts-ignore - pdf-parse doesn't export properly in ESM
const pdfParse = require('pdf-parse');

// @ts-ignore - rtf-parser doesn't have types
const RtfParser = require('rtf-parser');

export type DocumentType = 'pdf' | 'docx' | 'txt' | 'rtf';

export interface ProcessedDocument {
  text: string;
  wordCount: number;
  success: boolean;
  error?: string;
}

/**
 * Extract text from a PDF buffer
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a DOCX buffer
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a TXT buffer
 */
async function extractTxtText(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    throw new Error(`TXT extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from an RTF buffer
 */
async function extractRtfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parser = new RtfParser();
      let text = '';

      parser.on('text', (textChunk: string) => {
        text += textChunk;
      });

      parser.on('end', () => {
        resolve(text);
      });

      parser.on('error', (error: Error) => {
        reject(new Error(`RTF extraction failed: ${error.message}`));
      });

      // Create a readable stream from the buffer
      const stream = Readable.from(buffer);
      stream.pipe(parser);
    } catch (error) {
      reject(new Error(`RTF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Process a document buffer and extract text based on file type
 */
export async function processDocument(
  buffer: Buffer,
  fileType: DocumentType
): Promise<ProcessedDocument> {
  try {
    let text: string;

    switch (fileType) {
      case 'pdf':
        text = await extractPdfText(buffer);
        break;
      case 'docx':
        text = await extractDocxText(buffer);
        break;
      case 'txt':
        text = await extractTxtText(buffer);
        break;
      case 'rtf':
        text = await extractRtfText(buffer);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Clean up the text
    text = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim();

    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

    return {
      text,
      wordCount,
      success: true,
    };
  } catch (error) {
    return {
      text: '',
      wordCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate file type based on filename
 */
export function getFileType(filename: string): DocumentType | null {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'rtf':
      return 'rtf';
    default:
      return null;
  }
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  return size <= MAX_SIZE;
}

