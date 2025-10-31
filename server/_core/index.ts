import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeDatabase } from "../initDb";
import multer from "multer";
import { nanoid } from "nanoid";
import { createDocument, updateDocumentStatus } from "../db";
import { storagePut } from "../storage";
import { getFileType, validateFileSize, processDocument } from "../documentProcessor";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  // Try the preferred port first
  if (await isPortAvailable(startPort)) {
    return startPort;
  }
  
  // Check multiple ports in parallel for faster discovery
  const portsToCheck = Array.from({ length: 10 }, (_, i) => startPort + i + 1);
  const results = await Promise.all(
    portsToCheck.map(async port => ({
      port,
      available: await isPortAvailable(port)
    }))
  );
  
  const availablePort = results.find(r => r.available)?.port;
  if (availablePort) {
    return availablePort;
  }
  
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(server: ReturnType<typeof createServer>) {
  let isShuttingDown = false;
  
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Close server to stop accepting new connections
    server.close(() => {
      console.log('Server closed. All connections terminated.');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

/**
 * Get MIME type for supported file types
 */
function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
  };
  return mimeTypes[fileType] || 'application/octet-stream';
}

/**
 * Process document asynchronously after upload
 */
async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt' | 'rtf'
): Promise<void> {
  try {
    await updateDocumentStatus(documentId, 'processing');

    const result = await processDocument(buffer, fileType);

    if (!result.success) {
      throw new Error(result.error || 'Document processing failed');
    }

    await updateDocumentStatus(documentId, 'completed', result.text);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing document:', errorMessage);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Configure multer for file uploads (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // HTTP file upload endpoint (avoids FileReader issues in Replit)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filename = req.file.originalname;
      const buffer = req.file.buffer;
      const fileSize = req.file.size;

      // Get user from session (via createContext)
      const ctx = await createContext({ req, res });
      const userId = ctx.user?.id || 'anonymous';

      // Validate file type
      const fileType = getFileType(filename);
      if (!fileType) {
        return res.status(400).json({
          error: 'Unsupported file type. Please upload .pdf, .docx, .txt, or .rtf files.'
        });
      }

      // Validate file size
      if (!validateFileSize(fileSize)) {
        return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      }

      // Upload to S3
      const storageKey = `documents/${userId}/${nanoid()}-${filename}`;
      const mimeType = getMimeType(fileType);
      const { url: storageUrl } = await storagePut(storageKey, buffer, mimeType);

      // Create document record
      const documentId = nanoid();
      const document = await createDocument({
        id: documentId,
        userId,
        originalFilename: filename,
        fileType,
        fileSize,
        storageKey,
        storageUrl,
        status: 'uploaded',
      });

      // Process document asynchronously
      processDocumentAsync(documentId, buffer, fileType).catch(error => {
        console.error('Document processing failed:', error);
        updateDocumentStatus(documentId, 'failed', undefined, error.message);
      });

      res.json({
        success: true,
        documentId: document.id,
        message: 'Document uploaded successfully. Processing has started.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize database tables
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  
  // Setup graceful shutdown handlers
  setupGracefulShutdown(server);
}

startServer().catch(console.error);
