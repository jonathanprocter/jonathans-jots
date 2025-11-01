# Jonathan's Jots - Document Summarization Application

## Overview

Jonathan's Jots is a premium document summarization application that transforms books and documents into comprehensive, research-backed summaries. The application processes multiple document formats (PDF, DOCX, TXT, RTF) and generates detailed 10-14 page summaries using AI models, specifically designed to match the quality and style of professional book summaries with extensive citations and comparative analysis.

**Key Capabilities:**
- Upload and process documents up to 10MB in size
- Generate comprehensive summaries (8,000-12,000 words) with 12-15 main sections
- Include comparative analysis with 15-20 external book citations
- Live progress tracking during summary generation
- Professional Navy (#2E4057) and Cognac (#D4772E) branded UI with tilted "J" logo

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 19 with TypeScript for type-safe component development
- Vite as the build tool and development server
- TailwindCSS with custom theme configuration for styling
- shadcn/ui component library for consistent UI patterns

**State Management:**
- tRPC React Query for server state management and real-time data synchronization
- Local component state using React hooks
- Context API for theme management (ThemeContext)

**Key Design Decisions:**
- Single-page application (SPA) with wouter for client-side routing
- No authentication required (single-user application)
- Real-time polling for summary generation progress (1-2 second intervals)
- Responsive design supporting mobile, tablet, and desktop viewports
- Custom color palette (Navy + Cognac) with brand-specific logo integration

### Backend Architecture

**Runtime & Framework:**
- Node.js with Express server
- TypeScript throughout for type safety
- tRPC for type-safe API layer between client and server

**Document Processing Pipeline:**
1. File upload handling with Multer middleware
2. Text extraction using format-specific parsers:
   - PDF: pdf-parse library
   - DOCX: mammoth library
   - RTF: rtf-parser library
   - TXT: direct buffer reading
3. Storage of extracted text in database
4. Async summary generation with progress tracking

**AI Summary Generation:**
- Multi-model routing system supporting both OpenAI and Anthropic models
- Task-based model selection:
  - Claude 3.5 Sonnet for comprehensive summary generation (8,192 token output)
  - GPT-4 for document processing and quick analysis
- Retry logic with exponential backoff for API reliability
- Progressive summary generation with real-time progress updates
- Custom prompt engineering to ensure 10-14 page output with citations

**Key Design Patterns:**
- Lazy database connection initialization
- Connection pooling for database performance
- Graceful shutdown handling for server lifecycle
- Error boundary implementation for frontend fault tolerance
- Separation of concerns: routers, database layer, processing services

### Data Storage

**Database:**
- PostgreSQL as primary database (configured via Drizzle ORM)
- Schema includes:
  - `users` table for user authentication data
  - `documents` table for uploaded file metadata and extracted text
  - `summaries` table for generated summary content (stored as JSON)
  - `researchSources` table for cited external references

**File Storage:**
- Local filesystem storage in `uploads/` directory
- Future S3 compatibility built into storage abstraction layer
- Presigned URL support for secure file access
- In-memory cache for download URL generation

**Database Access Patterns:**
- Drizzle ORM for type-safe database queries
- Database pool configuration with configurable size and timeouts
- Automatic table initialization on server startup
- Connection retry logic for resilience

### External Dependencies

**AI Services:**
- OpenAI API for GPT-4 models (document processing, quick analysis)
- Anthropic API for Claude 3.5 Sonnet (comprehensive summary generation)
- Intelligent routing between models based on task requirements
- Support for custom API endpoints via environment configuration

**Document Processing Libraries:**
- `pdf-parse` for PDF text extraction
- `mammoth` for DOCX file processing
- `rtf-parser` for RTF file handling
- `multer` for multipart form data handling

**Authentication (Optional):**
- JWT-based session management using `jose` library
- OAuth integration architecture (currently disabled, awaiting ManusClient package)
- Cookie-based session storage with configurable security options

**Supporting Services:**
- AWS S3 SDK (configured but currently using local storage)
- Database migration tooling via Drizzle Kit
- Analytics integration via Umami (configurable)

**Development Tools:**
- ESBuild for server-side bundling
- Vitest for testing framework
- Prettier for code formatting
- TypeScript compiler for type checking