# AI Document Vault

A production-grade AI-powered document management system that automatically processes, summarizes, and organizes documents using Claude AI. Built with React, Node.js, TypeScript, and Supabase.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Architecture](#architecture)
- [Document Lifecycle](#document-lifecycle)
- [AI Processing Strategy](#ai-processing-strategy)
- [Grouping Design](#grouping-design)
- [Supabase Usage Rationale](#supabase-usage-rationale)
- [Deployment Strategy](#deployment-strategy)
- [Trade-offs and Future Improvements](#trade-offs-and-future-improvements)
- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [License](#license)

## Problem Statement

Modern knowledge workers face significant challenges in managing and extracting value from documents:

1. **Information Overload**: Large volumes of documents accumulate without organization
2. **Time-Consuming Review**: Manually reading and summarizing documents is slow and error-prone
3. **Poor Discoverability**: Finding relevant documents requires remembering exact filenames or content
4. **Lack of Context**: Documents exist in isolation without relationships or groupings
5. **No Intelligence**: Documents are static files without extracted insights or summaries

**Solution**: An AI-powered document vault that automatically:
- Processes documents asynchronously without blocking user workflows
- Generates concise summaries and clean markdown representations
- Suggests intelligent groupings based on semantic similarity
- Provides search and filtering capabilities across content
- Maintains a non-blocking, resilient architecture that handles failures gracefully

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Upload UI  │  │ Document List│  │ Group Sidebar│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │  API Client │                              │
│                    │  (Typed)    │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              Backend (Node.js Serverless)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Upload     │  │   Search     │  │   Groups     │         │
│  │   Handler    │  │   Handler    │  │   Handler    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   Supabase  │                              │
│                    │   Client    │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  PostgreSQL  │  │  Supabase       │  │  Claude AI   │
│  Database    │  │  Storage        │  │  API         │
│              │  │  (S3-compatible)│  │              │
│  - documents │  │                 │  │  - Summary   │
│  - groups    │  │  - Original     │  │  - Markdown  │
│  - relations │  │    files        │  │  - Grouping  │
└──────────────┘  └──────────────────┘  └──────────────┘
```

### Monorepo Structure

```
ai-document-vault/
├── apps/
│   ├── web/              # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # API client, utilities
│   │   │   └── App.tsx         # Main application
│   │   └── package.json
│   │
│   └── api/              # Node.js serverless backend
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── lib/            # Supabase, AI, storage utilities
│       │   └── server.ts       # Development server
│       ├── api/                # Serverless function wrappers
│       └── package.json
│
├── packages/
│   └── shared/           # Shared TypeScript types & contracts
│       ├── src/
│       │   └── types/          # Document, Group, API types
│       └── package.json
│
├── schema.sql            # Database schema
├── DEPLOYMENT.md         # Deployment guide
└── package.json          # Root workspace configuration
```

### Key Architectural Principles

1. **Shared Contracts**: Frontend and backend share TypeScript types via `@ai-document-vault/shared` package, ensuring type safety and contract compliance
2. **Asynchronous Processing**: AI operations never block user interactions
3. **Non-blocking UX**: Users can continue working while documents process
4. **Failure Resilience**: Comprehensive error handling, retries, and graceful degradation
5. **Serverless-First**: Designed for Vercel/Netlify deployment with auto-scaling
6. **Type Safety**: End-to-end TypeScript with strict mode enabled

## Document Lifecycle

### State Machine

```
┌──────────┐
│ UPLOADED │  ← Document uploaded, file stored, record created
└────┬─────┘
     │
     │ (Async trigger)
     │
┌────▼─────────┐
│ PROCESSING   │  ← AI processing in progress
└────┬─────────┘
     │
     ├─────────────────┐
     │                 │
┌────▼─────┐    ┌──────▼──────┐
│  READY   │    │   FAILED    │
└──────────┘    └──────┬───────┘
                       │
                       │ (User retry)
                       │
                  ┌────▼─────┐
                  │ UPLOADED │  ← Reset and retry
                  └──────────┘
```

### Lifecycle Stages

1. **UPLOADED**
   - User uploads document via drag-and-drop or file picker
   - File uploaded to Supabase Storage
   - Document record created in database with `status = UPLOADED`
   - API returns immediately (non-blocking)
   - Frontend shows document with optimistic `PROCESSING` status

2. **PROCESSING**
   - Background job triggered asynchronously
   - File downloaded from storage
   - Text extracted (PDF parsing, text extraction)
   - Claude AI called to generate:
     - **Summary**: 2-3 sentence concise overview
     - **Markdown**: Clean, structured markdown representation
   - Status updated to `PROCESSING` during execution

3. **READY**
   - AI processing completes successfully
   - Summary and markdown stored in database
   - Status updated to `READY`
   - Document fully searchable and viewable

4. **FAILED**
   - Processing encounters error (network, AI API, parsing)
   - Status updated to `FAILED`
   - Error details logged for debugging
   - User can retry via retry button
   - Retry resets status to `UPLOADED` and triggers processing again

### Frontend Status Polling

- Automatically polls every 2 seconds for documents with `PROCESSING` status
- Updates UI when status changes to `READY` or `FAILED`
- Stops polling when document reaches terminal state
- Handles network errors gracefully without breaking UI

## AI Processing Strategy

### Asynchronous Architecture

**Design Decision**: AI processing is completely asynchronous and non-blocking.

**Rationale**:
- AI API calls can take 5-30+ seconds depending on document size
- Blocking would create poor user experience
- Users should be able to upload multiple documents and continue working
- Failures in AI processing should not break the upload flow

### Processing Pipeline

```
1. Upload Complete
   ↓
2. Trigger Background Job (non-blocking)
   ↓
3. Download File from Storage
   ↓
4. Extract Text Content
   ├─ PDF → pdf-parse library
   └─ Text → Direct read
   ↓
5. Call Claude API
   ├─ Input: Extracted text + filename
   ├─ Prompt: Generate summary + markdown
   └─ Output: JSON with {summary, markdown}
   ↓
6. Parse and Validate Response
   ├─ Handle markdown code blocks
   ├─ Handle raw JSON
   └─ Validate structure
   ↓
7. Update Database
   ├─ Store summary
   ├─ Store markdown
   ├─ Update status to READY
   └─ Record AI model used
```

### Error Handling

**Retry Strategy**:
- Exponential backoff: 2s, 4s, 8s delays
- Maximum 3 retry attempts
- Only retries transient failures (returns null)
- Permanent failures marked as `FAILED` immediately

**Failure Modes**:
1. **Network Errors**: Retried with exponential backoff
2. **AI API Errors**: Categorized (auth, rate limit, content) and handled appropriately
3. **Parsing Errors**: Robust JSON parsing with fallbacks for markdown-wrapped responses
4. **File Errors**: Document marked as `FAILED`, user can retry

**Resilience Principles**:
- AI failures never break the UI
- All errors are logged with context
- Users always have retry capability
- Status updates are idempotent

### AI Model Configuration

- **Model**: Claude (Anthropic)
- **Input**: Document text content (truncated to 100k tokens if needed)
- **Output Format**: JSON with `summary` and `markdown` fields
- **Prompt Engineering**: Structured prompts for consistent output
- **Token Management**: Input truncation for large documents

## Grouping Design

### Group Types

1. **MANUAL**: User-created groups for explicit organization
2. **AI_SUGGESTED**: AI-generated suggestions requiring user approval
3. **SMART**: Future - automatically maintained groups (not yet implemented)

### Grouping Strategy

**AI-Assisted Grouping**:

```
1. User clicks "Generate Suggestions"
   ↓
2. Backend fetches all documents with READY status
   ↓
3. Extracts summaries for semantic analysis
   ↓
4. Calls Claude API with:
   ├─ Document summaries
   ├─ Prompt: Analyze and suggest logical groupings
   └─ Output: JSON array of group suggestions
   ↓
5. Filters suggestions by confidence (≥ 0.6)
   ↓
6. Returns suggestions to frontend
   ↓
7. User reviews and accepts/rejects
   ↓
8. Accepted suggestions create groups and add documents
```

**Key Design Decisions**:

1. **Never Auto-Assign**: All AI suggestions require explicit user approval
   - Rationale: Users maintain control over organization
   - Prevents unwanted automatic categorization

2. **Confidence Threshold**: Only show suggestions with ≥ 0.6 confidence
   - Rationale: Reduce noise and improve suggestion quality
   - Lower confidence suggestions are filtered out

3. **Semantic Analysis**: Uses document summaries, not full content
   - Rationale: Summaries capture key themes efficiently
   - Reduces token usage and processing time

4. **Many-to-Many Relationships**: Documents can belong to multiple groups
   - Rationale: Real-world documents often fit multiple categories
   - Flexible organization without duplication

### Group Management

- **Create**: Users can create manual groups with custom names
- **Delete**: Groups can be deleted (cascade removes document relationships)
- **Add/Remove Documents**: Documents can be added to or removed from groups
- **View by Group**: Filter documents by group membership
- **Group Sidebar**: Navigate between groups and "All Documents" view

## Supabase Usage Rationale

### Why Supabase?

**1. Integrated Stack**
- PostgreSQL database + S3-compatible storage in one platform
- Reduces infrastructure complexity
- Single authentication and access control system

**2. Serverless-Friendly**
- RESTful API works seamlessly with serverless functions
- No connection pooling concerns
- Auto-scaling database handles traffic spikes

**3. Developer Experience**
- TypeScript client with excellent type inference
- Real-time subscriptions (future: replace polling)
- Built-in Row Level Security (RLS) for multi-tenant scenarios
- SQL editor and dashboard for database management

**4. Cost Efficiency**
- Generous free tier for development
- Pay-as-you-go pricing scales with usage
- No infrastructure management overhead

**5. Production-Ready Features**
- Automatic backups
- Point-in-time recovery
- Built-in monitoring and logging
- Global CDN for storage

### Database Design

**Tables**:
- `documents`: Document metadata, AI outputs, status tracking
- `groups`: Group definitions with type classification
- `document_groups`: Many-to-many relationship table

**Indexes**:
- Status indexes for filtering by processing state
- Timestamp indexes for chronological queries
- Composite indexes for relationship lookups

**Storage**:
- Private bucket for document files
- Signed URLs for secure, time-limited access
- Automatic cleanup on document deletion

### Trade-offs

**Pros**:
- Fast development and deployment
- Integrated storage and database
- Excellent TypeScript support
- Real-time capabilities available

**Cons**:
- Vendor lock-in (though PostgreSQL is standard)
- Limited control over database configuration
- Storage pricing can scale with large files
- Migration to self-hosted requires effort

## Deployment Strategy

### Serverless Architecture

**Frontend**: Static site (Vite build) deployed to:
- **Vercel**: Automatic deployments, edge network, zero config
- **Netlify**: Similar capabilities, alternative platform

**Backend**: Serverless functions deployed to:
- **Vercel**: Node.js functions with automatic routing
- **Netlify**: Netlify Functions with similar capabilities

### Deployment Flow

```
1. Push to Git Repository
   ↓
2. Vercel/Netlify detects changes
   ↓
3. Build Process:
   ├─ Frontend: npm run build → dist/
   └─ Backend: TypeScript compilation → serverless functions
   ↓
4. Deploy:
   ├─ Frontend: Static files to CDN
   └─ Backend: Functions to serverless runtime
   ↓
5. Environment Variables Injected
   ↓
6. Application Live
```

### Configuration Files

- `apps/web/vercel.json` / `apps/web/netlify.toml`: Frontend deployment config
- `apps/api/vercel.json` / `apps/api/netlify.toml`: Backend function config
- Environment variables set in deployment platform dashboard

### Scaling Characteristics

- **Frontend**: CDN caching, infinite horizontal scaling
- **Backend**: Auto-scaling serverless functions, handles traffic spikes
- **Database**: Supabase auto-scales PostgreSQL
- **Storage**: Supabase Storage scales with usage

### Security

- Environment variables never committed to Git
- Service role keys only in backend (never exposed to frontend)
- Signed URLs for file access (time-limited, secure)
- CORS configured for frontend domain only
- Error messages sanitized (no sensitive data leakage)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed deployment instructions.

## Trade-offs and Future Improvements

### Current Trade-offs

**1. Polling vs Real-time**
- **Current**: Frontend polls every 2 seconds for status updates
- **Trade-off**: Simple implementation, but inefficient for many documents
- **Future**: Implement Supabase real-time subscriptions for instant updates

**2. Synchronous AI Processing**
- **Current**: AI processing triggered immediately after upload
- **Trade-off**: Works for small scale, but no queue management
- **Future**: Implement job queue (Bull, BullMQ, or Supabase Queue) for better scalability

**3. File Type Support**
- **Current**: PDF and text files supported
- **Trade-off**: Limited file type coverage
- **Future**: Add DOCX, PPTX, images with OCR, etc.

**4. Search Implementation**
- **Current**: PostgreSQL `ilike` queries (case-insensitive pattern matching)
- **Trade-off**: Works for small datasets, not optimized for full-text search
- **Future**: Implement PostgreSQL full-text search or Elasticsearch for better performance

**5. Grouping Suggestions**
- **Current**: One-time suggestion generation
- **Trade-off**: Static suggestions, don't update as documents are added
- **Future**: Incremental grouping updates, re-suggestion on new documents

**6. Authentication**
- **Current**: No user authentication (single-tenant)
- **Trade-off**: Simple, but not suitable for multi-user scenarios
- **Future**: Add Supabase Auth for multi-user support with RLS policies

### Future Improvements

**Short-term (1-3 months)**:
1. **Real-time Status Updates**: Replace polling with Supabase subscriptions
2. **Enhanced File Support**: Add DOCX, PPTX parsing
3. **Better Search**: PostgreSQL full-text search with ranking
4. **Batch Operations**: Upload and process multiple files
5. **Export Functionality**: Export documents and groups

**Medium-term (3-6 months)**:
1. **Job Queue**: Implement proper queue system for AI processing
2. **User Authentication**: Multi-user support with Supabase Auth
3. **Advanced Grouping**: Incremental AI suggestions, smart groups
4. **Analytics**: Document usage, processing metrics, group insights
5. **API Rate Limiting**: Protect against abuse

**Long-term (6+ months)**:
1. **Multi-tenant Architecture**: Organization-level isolation
2. **Custom AI Models**: Fine-tuned models for specific domains
3. **Collaboration Features**: Sharing, comments, annotations
4. **Version Control**: Document versioning and history
5. **Integration APIs**: Webhooks, Zapier, API for third-party integrations

**Performance Optimizations**:
- Implement caching layer (Redis) for frequently accessed documents
- Add CDN for document file delivery
- Optimize database queries with materialized views
- Implement pagination for large document lists

**Developer Experience**:
- Add comprehensive test suite (unit, integration, E2E)
- Implement CI/CD pipeline with automated testing
- Add monitoring and observability (Sentry, DataDog)
- Create developer documentation and API reference

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account (free tier works)
- Anthropic API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd outmarket_assignment

# Install dependencies
npm install

# Build shared package (required first)
npm run build --workspace=packages/shared
```

### Environment Setup

1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project
   - Apply `schema.sql` in SQL Editor
   - Create `documents` storage bucket

2. **Configure Environment Variables**:

   **Backend** (`apps/api/.env.local`):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   STORAGE_BUCKET_NAME=documents
   ```

   **Frontend** (`apps/web/.env.local`):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

### Development

```bash
# Run all apps
npm run dev

# Or run individually:
npm run dev --workspace=apps/web    # Frontend: http://localhost:3000
npm run dev --workspace=apps/api    # Backend: http://localhost:3001
```

### Building

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=apps/web
npm run build --workspace=apps/api
```

## Tech Stack

### Frontend
- **React 18**: UI framework with hooks
- **TypeScript**: Type safety
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **react-markdown**: Markdown rendering

### Backend
- **Node.js**: Runtime environment
- **TypeScript**: Type safety
- **Supabase**: Database and storage
- **Anthropic Claude**: AI document processing
- **pdf-parse**: PDF text extraction

### Infrastructure
- **Vercel/Netlify**: Serverless hosting
- **Supabase PostgreSQL**: Database
- **Supabase Storage**: File storage (S3-compatible)

### Development Tools
- **Turbo**: Monorepo build system
- **ESLint**: Code linting
- **TypeScript**: Static type checking

## Project Structure

### Shared Package (`packages/shared`)

Type-safe contracts between frontend and backend:

```typescript
import {
  Document,
  DocumentStatus,
  Group,
  GroupType,
  ApiResponse,
  ApiError,
} from '@ai-document-vault/shared';
```

**Key Types**:
- `Document`: Document metadata and AI outputs
- `DocumentStatus`: Enum (UPLOADED, PROCESSING, READY, FAILED)
- `Group`: Group definition with type
- `GroupType`: Enum (MANUAL, AI_SUGGESTED, SMART)
- `ApiResponse<T>`: Standardized API response wrapper
- `ApiError`: Error response format

### Frontend (`apps/web`)

**Components**:
- `DocumentUpload`: Drag-and-drop file upload
- `DocumentList`: List of documents with status badges
- `DocumentView`: Document viewer with tabs (Original, Summary, Markdown)
- `GroupSidebar`: Group navigation and management
- `AIGroupSuggestions`: AI grouping suggestions UI
- `SearchAndFilter`: Search and filtering interface
- `ErrorBoundary`: React error boundary for graceful failures
- `ErrorDisplay`: Consistent error message display

**Hooks**:
- `useDocumentStatus`: Polls document status and updates UI
- `useDocumentGroups`: Fetches and manages document group memberships

**API Client**:
- Typed API client with error handling
- Shared types ensure contract compliance

### Backend (`apps/api`)

**Routes**:
- `documents/`: Upload, list, get, delete, search, retry
- `groups/`: Create, list, delete, suggest, manage memberships

**Libraries**:
- `lib/supabase`: Supabase client initialization
- `lib/storage`: File upload, download, signed URL generation
- `lib/ai/claude`: Claude API integration
- `lib/ai/processor`: Document processing workflow

**Serverless Functions**:
- `api/`: Vercel/Netlify function wrappers
- Automatic routing based on file structure

## Development

### Adding New Types

1. Add types to `packages/shared/src/types/`
2. Export from `packages/shared/src/index.ts`
3. Build shared package: `npm run build --workspace=packages/shared`
4. Use in frontend/backend: `import { NewType } from '@ai-document-vault/shared'`

### Type Checking

```bash
# Check all workspaces
npm run type-check

# Check specific workspace
npm run type-check --workspace=apps/web
```

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Linting rules configured
- **Shared Contracts**: Types ensure frontend/backend compatibility
- **Error Handling**: Comprehensive error boundaries and explicit error states

## License

Private - All rights reserved

---

**Built with ❤️ for production-grade document management**
