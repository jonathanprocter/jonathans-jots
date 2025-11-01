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
    console.log(`[PDF] Starting extraction, buffer size: ${buffer.length} bytes`);
    const data = await pdfParse(buffer);
    console.log(`[PDF] Extraction successful, text length: ${data.text.length} chars`);
    return data.text;
  } catch (error) {
    console.error('[PDF] Extraction failed:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a DOCX buffer
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    console.log(`[DOCX] Starting extraction, buffer size: ${buffer.length} bytes`);
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[DOCX] Extraction successful, text length: ${result.value.length} chars`);
    return result.value;
  } catch (error) {
    console.error('[DOCX] Extraction failed:', error);
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
      console.log(`[RTF] Starting extraction, buffer size: ${buffer.length} bytes`);
      const parser = new RtfParser();
      let text = '';

      parser.on('text', (textChunk: string) => {
        text += textChunk;
      });

      parser.on('end', () => {
        console.log(`[RTF] Extraction successful, text length: ${text.length} chars`);
        resolve(text);
      });

      parser.on('error', (error: Error) => {
        console.error('[RTF] Parser error:', error);
        reject(new Error(`RTF extraction failed: ${error.message}`));
      });

      // Create a readable stream from the buffer
      const stream = Readable.from(buffer);
      stream.pipe(parser);
    } catch (error) {
      console.error('[RTF] Extraction failed:', error);
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
    console.log(`[Processor] Processing ${fileType} document, buffer size: ${buffer.length} bytes`);
    
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer provided for processing');
    }

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

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      console.warn('[Processor] No text extracted from document');
      throw new Error('No text could be extracted from the document. The file may be empty or corrupted.');
    }

    // Clean up the text more efficiently
    text = cleanText(text);

    const wordCount = countWords(text);
    console.log(`[Processor] Processing complete. Word count: ${wordCount}`);

    return {
      text,
      wordCount,
      success: true,
    };
  } catch (error) {
    console.error('[Processor] Processing failed:', error);
    return {
      text: '',
      wordCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Clean text efficiently
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')        // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')    // Remove excessive line breaks
    .replace(/[ \t]+/g, ' ')       // Normalize spaces and tabs
    .trim();
}

/**
 * Count words efficiently
 */
function countWords(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // More efficient word counting without creating array
  let count = 0;
  let inWord = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isWhitespace = char === ' ' || char === '\n' || char === '\t' || char === '\r';
    
    if (isWhitespace) {
      if (inWord) {
        count++;
        inWord = false;
      }
    } else {
      inWord = true;
    }
  }
  
  // Count the last word if we ended in one
  if (inWord) count++;
  
  return count;
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

