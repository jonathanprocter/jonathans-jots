// Storage implementation for Jonathan's Jots
// Supports both Replit Object Storage and local filesystem

import { promises as fs } from 'fs';
import path from 'path';
import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

// Determine storage mode: Replit Object Storage or local filesystem
const USE_REPLIT_STORAGE = !!process.env.PRIVATE_OBJECT_DIR;
const REPLIT_STORAGE_DIR = process.env.PRIVATE_OBJECT_DIR || '';
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

// Storage directory (use Replit bucket if available, otherwise local)
const STORAGE_DIR = USE_REPLIT_STORAGE ? REPLIT_STORAGE_DIR : LOCAL_STORAGE_DIR;

console.log(`[Storage] Using ${USE_REPLIT_STORAGE ? 'Replit Object Storage' : 'local filesystem'}: ${STORAGE_DIR}`);

// Simple in-memory cache for download URLs
const urlCache = new Map<string, { url: string; expiry: number }>();

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = parseInt(process.env.STORAGE_RETRY_ATTEMPTS || "3", 10),
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Storage operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Store data to local filesystem
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  return withRetry(async () => {
    await ensureStorageDir();
    
    const key = normalizeKey(relKey);
    const filePath = path.join(STORAGE_DIR, key);
    
    // Ensure directory exists for nested keys
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    await fs.writeFile(filePath, buffer);
    
    // Generate URL (relative to server)
    const url = `/api/storage/${key}`;
    
    console.log(`[Storage] Saved file: ${key} (${buffer.length} bytes)`);
    
    return { key, url };
  });
}

/**
 * Get download URL for stored file
 */
export async function storageGet(
  relKey: string,
  expiresIn = 300
): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  
  // Check cache
  const cached = urlCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return { key, url: cached.url };
  }
  
  // Verify file exists
  const filePath = path.join(STORAGE_DIR, key);
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found: ${key}`);
  }
  
  // Generate URL
  const url = `/api/storage/${key}`;
  
  // Cache the URL
  urlCache.set(key, {
    url,
    expiry: Date.now() + (expiresIn * 1000 * 0.9),
  });
  
  return { key, url };
}

/**
 * Get file from storage (for serving)
 */
export async function storageGetFile(relKey: string): Promise<Buffer> {
  const key = normalizeKey(relKey);
  const filePath = path.join(STORAGE_DIR, key);
  
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw new Error(`File not found: ${key}`);
  }
}

// Legacy compatibility - these functions are not needed for local storage
// but kept for compatibility with existing code
function getStorageConfig(): StorageConfig {
  // Return dummy config - not used in local storage mode
  return { baseUrl: '', apiKey: '' };
}

