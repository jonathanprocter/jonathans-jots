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
import multer, { MulterError } from "multer";
import {
  handleDocumentUpload,
  SUPPORTED_FILE_TYPES,
  getMimeType,
} from "../documentUploadService";
import { sdk } from "./sdk";
import { storageGetFile } from "../storage";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

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

async function startServer() {
  const app = express();
  const server = createServer(app);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      const extension = (file.originalname.split(".").pop() || "").toLowerCase();
      if ((SUPPORTED_FILE_TYPES as readonly string[]).includes(extension)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Unsupported file type. Allowed types: ${SUPPORTED_FILE_TYPES.join(", ")}`
          )
        );
      }
    },
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.post("/api/documents/upload", (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              error: "File size exceeds 10MB limit.",
            });
          }

          return res.status(400).json({
            success: false,
            error: err.message,
          });
        }

        return res.status(400).json({
          success: false,
          error: err instanceof Error ? err.message : "File upload failed",
        });
      }

      const file = req.file;

      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded. Ensure the form field name is 'file'.",
        });
      }

      try {
        const user = await sdk.authenticateRequest(req);
        const userId = user?.id ?? "anonymous";

        const result = await handleDocumentUpload({
          filename: file.originalname,
          fileSize: file.size,
          buffer: file.buffer,
          userId,
        });

        res.status(200).json({
          success: true,
          documentId: result.documentId,
          message: result.message,
        });
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to process uploaded document";
        res.status(400).json({
          success: false,
          error: message,
        });
      }
    });
  });

  app.get("/api/storage/*", async (req, res) => {
    const rawKey = req.params[0];

    if (!rawKey) {
      return res.status(400).json({
        success: false,
        error: "Storage key is required",
      });
    }

    const key = decodeURIComponent(rawKey);

    try {
      const buffer = await storageGetFile(key);
      const extension = key.split(".").pop() || "";

      res.setHeader("Content-Type", getMimeType(extension));
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "File not found",
      });
    }
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
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
