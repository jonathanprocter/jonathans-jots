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
  // Log environment configuration on startup
  console.log('\n=== Environment Configuration ===');
  console.log('API Keys:');
  console.log('  BUILT_IN_FORGE_API_KEY:', process.env.BUILT_IN_FORGE_API_KEY ? '✓ SET' : '✗ NOT SET');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ SET' : '✗ NOT SET');
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ SET' : '✗ NOT SET');
  console.log('API URLs:');
  console.log('  BUILT_IN_FORGE_API_URL:', process.env.BUILT_IN_FORGE_API_URL || '(not set)');
  console.log('  OPENAI_API_URL:', process.env.OPENAI_API_URL || '(not set)');
  console.log('  ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL || '(not set)');

  // Auto-detect default model based on which API key is set (matches llm.ts priority)
  let defaultModel = 'gpt-4-turbo-preview';
  let provider = 'OpenAI';
  if (process.env.ANTHROPIC_API_KEY) {
    defaultModel = 'claude-3-5-sonnet-20241022';
    provider = 'Anthropic';
  } else if (process.env.OPENAI_API_KEY) {
    defaultModel = 'gpt-4-turbo-preview';
    provider = 'OpenAI';
  }
  console.log('Model:', process.env.OPENAI_MODEL || `${defaultModel} (auto-detected)`);
  console.log('Provider:', provider);
  console.log('================================\n');

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
