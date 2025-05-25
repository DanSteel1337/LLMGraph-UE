# LLMGraph-UE: Serverless RAG Dashboard
## Comprehensive Project Documentation

### Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [API Routes](#api-routes)
6. [Authentication System](#authentication-system)
7. [Database & Storage](#database--storage)
8. [Configuration](#configuration)
9. [Development Workflow](#development-workflow)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

LLMGraph-UE is a production-ready serverless RAG (Retrieval-Augmented Generation) dashboard specifically designed for UE5.4 API documentation. It combines modern web technologies with AI capabilities to provide intelligent document search and question-answering.

### Key Features
- **Serverless Architecture**: Built on Vercel Edge Runtime for global performance
- **AI-Powered Search**: Vector similarity search with OpenAI embeddings
- **Document Processing**: Intelligent chunking and metadata extraction
- **Real-time Chat**: Streaming AI responses with source attribution
- **Debug & Monitoring**: Comprehensive health checks and system diagnostics
- **Single-User Auth**: Secure authentication via Supabase

### Technology Stack
- **Frontend**: React 19, Next.js 15 App Router, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Edge Functions, Vercel AI SDK
- **Authentication**: Supabase Auth with split client/server pattern
- **Vector Database**: Pinecone Serverless (3072-dimensional vectors)
- **Document Storage**: Vercel Blob (private access)
- **Metadata Storage**: Vercel KV with TTL support
- **AI Models**: OpenAI text-embedding-3-large, GPT-4o

---

## Architecture

### System Architecture Layers

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  React Components + shadcn/ui + Tailwind CSS              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  Next.js App Router + Vercel AI SDK + Error Boundaries    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                             │
│  Edge Runtime Routes + Streaming + Server Auth            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                           │
│  Document Processor + Vector Search + Chat Generation     │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                             │
│  Pinecone + Vercel Blob + Vercel KV + Supabase Auth      │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Key Design Principles
- **Edge-First**: All API routes optimized for Edge Runtime
- **Streaming-First**: Real-time progress updates and AI responses
- **Split Authentication**: Separate client/server auth for build safety
- **Error Resilience**: Comprehensive error handling at all levels
- **Type Safety**: Full TypeScript implementation

---

## Project Structure

\`\`\`
llmgraph-ue/
├── README.md                           # Project overview
├── COMPREHENSIVE_DOCUMENTATION.md      # This file
├── next.config.js                      # Next.js configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── middleware.ts                       # Next.js middleware (minimal)
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
│
├── app/                                # Next.js App Router
│   ├── globals.css                     # Global styles and CSS variables
│   ├── layout.tsx                      # Root layout with metadata
│   ├── page.tsx                        # Landing page
│   │
│   ├── auth/                           # Authentication pages
│   │   ├── layout.tsx                  # Auth layout wrapper
│   │   └── login/
│   │       └── page.tsx                # Login page with auth form
│   │
│   ├── dashboard/                      # Main application
│   │   ├── layout.tsx                  # Dashboard layout with auth protection
│   │   ├── page.tsx                    # Main chat interface
│   │   ├── documents/
│   │   │   └── page.tsx                # Document management interface
│   │   ├── settings/
│   │   │   └── page.tsx                # RAG configuration settings
│   │   └── debug/
│   │       └── page.tsx                # System diagnostics and debug tools
│   │
│   ├── components/                     # React components (can use @ imports)
│   │   ├── auth/
│   │   │   └── auth-form.tsx           # Login form component
│   │   ├── chat/
│   │   │   ├── chat-window.tsx         # Main chat interface with streaming
│   │   │   ├── chat-input.tsx          # Message input with keyboard shortcuts
│   │   │   └── chat-message.tsx        # Message display with markdown
│   │   ├── documents/
│   │   │   ├── document-list.tsx       # Document grid with empty states
│   │   │   ├── document-card.tsx       # Document status display
│   │   │   └── upload-form.tsx         # Multi-stage upload with progress
│   │   ├── layout/
│   │   │   ├── header.tsx              # App header with user menu
│   │   │   └── sidebar.tsx             # Navigation sidebar
│   │   ├── settings/
│   │   │   └── settings-form.tsx       # RAG parameter configuration
│   │   ├── debug/
│   │   │   ├── debug-panel.tsx         # System health dashboard
│   │   │   ├── debug-overlay.tsx       # Development debug overlay
│   │   │   └── storage-cleanup.tsx     # Storage management tools
│   │   └── ui/
│   │       ├── error-boundary.tsx      # Error handling wrapper
│   │       └── custom-badge.tsx        # Status badges
│   │
│   └── api/                            # Edge Runtime API routes (use relative imports)
│       ├── chat/
│       │   └── route.ts                # AI chat completions with RAG
│       ├── search/
│       │   └── route.ts                # Direct vector search API
│       ├── settings/
│       │   └── route.ts                # RAG configuration CRUD
│       ├── health/
│       │   ├── route.ts                # System health monitoring
│       │   └── storage/
│       │       └── route.ts            # Storage-specific health checks
│       ├── documents/
│       │   ├── route.ts                # Document CRUD operations
│       │   ├── upload/
│       │   │   └── route.ts            # File upload to Vercel Blob
│       │   └── process/
│       │       └── route.ts            # Document processing with streaming
│       └── debug/
│           ├── route.ts                # System debug information
│           └── cleanup/
│               └── route.ts            # KV cleanup utilities
│
├── lib/                                # Shared library code
│   ├── auth-server.ts                  # Server-side auth functions
│   ├── auth-client.ts                  # Client-side auth functions
│   ├── hooks/
│   │   └── use-auth.ts                 # Auth state hook for components
│   │
│   ├── ai/                             # AI utilities
│   │   ├── chat.ts                     # Chat formatting and utilities
│   │   ├── embeddings.ts               # Embedding generation
│   │   └── prompts.ts                  # RAG prompt templates
│   │
│   ├── documents/                      # Document processing
│   │   ├── processor.ts                # Main processing pipeline
│   │   ├── chunker.ts                  # Semantic document chunking
│   │   └── storage.ts                  # Document storage utilities
│   │
│   ├── pinecone/                       # Vector database integration
│   │   ├── rest-client.ts              # Edge-compatible REST client
│   │   ├── client.ts                   # Client factory and singleton
│   │   ├── search.ts                   # Vector search utilities
│   │   └── types.ts                    # Pinecone type definitions
│   │
│   └── utils/                          # Utility functions
│       ├── env.ts                      # Environment validation
│       ├── debug.ts                    # Debug utilities
│       ├── retry.ts                    # Retry logic with backoff
│       ├── cleanup.ts                  # KV cleanup utilities
│       ├── blob-fetch.ts               # Blob storage operations
│       └── index.ts                    # Utility exports
│
├── components/ui/                      # shadcn/ui components
│   ├── button.tsx                      # Button component
│   ├── input.tsx                       # Input component
│   ├── card.tsx                        # Card component
│   ├── tabs.tsx                        # Tabs component
│   ├── skeleton.tsx                    # Loading skeleton
│   ├── progress.tsx                    # Progress bar
│   ├── label.tsx                       # Form label
│   ├── toast.tsx                       # Toast notification
│   ├── toaster.tsx                     # Toast container
│   └── [other shadcn components]       # Additional UI components
│
├── hooks/                              # React hooks
│   └── use-toast.ts                    # Toast notification hook
│
├── docs/                               # Documentation
│   ├── AUTH_LOCKED.md                  # Authentication architecture details
│   ├── PINECONE_REST_CLIENT.md         # Vector database setup guide
│   └── PROJECT_STRUCTURE.md            # Detailed structure documentation
│
└── types/                              # TypeScript type definitions
    └── supabase.ts                     # Supabase type definitions
\`\`\`

---

## Core Components

### Authentication Components

#### `lib/auth-server.ts`
**Purpose**: Server-side authentication for API routes
**Key Functions**:
- `getSupabaseServer()`: Server-side Supabase client
- `requireAuth()`: Route protection that throws if unauthorized

#### `lib/auth-client.ts`
**Purpose**: Client-side authentication functions
**Key Functions**:
- `getSupabaseClient()`: Browser-side singleton client
- `signIn()`: Email/password authentication
- `signOut()`: Clear session and logout
- `getCurrentUser()`: Get current user

#### `lib/hooks/use-auth.ts`
**Purpose**: React hook for auth state management
**Features**:
- Provides user state and loading status
- Listens for auth state changes
- Used in client components

### Document Processing Components

#### `lib/documents/processor.ts`
**Purpose**: Main document processing pipeline
**Features**:
- Orchestrates chunking, embedding, and storage
- Real-time progress updates via Server-Sent Events
- Error handling and recovery

#### `lib/documents/chunker.ts`
**Purpose**: Semantic document chunking
**Features**:
- Text documents: 200-500 tokens with 100 token overlap
- Code documents: 750-1500 tokens with 200 token overlap
- Preserves complete code blocks
- Rich metadata extraction

#### `lib/documents/storage.ts`
**Purpose**: Document storage utilities
**Features**:
- Vercel Blob integration
- Metadata management in KV
- File type validation

### Vector Search Components

#### `lib/pinecone/rest-client.ts`
**Purpose**: Edge-compatible Pinecone REST client
**Features**:
- Lightweight fetch-based implementation
- Works without Node.js dependencies
- Retry logic with exponential backoff
- Dimension validation (3072D)

#### `lib/pinecone/search.ts`
**Purpose**: Vector search operations
**Features**:
- Hybrid search (vector + keyword)
- Technical term weighting
- Result deduplication
- Fallback strategies

### AI Components

#### `lib/ai/embeddings.ts`
**Purpose**: Text embedding generation
**Features**:
- OpenAI text-embedding-3-large integration
- Batch processing for efficiency
- Error handling and retries

#### `lib/ai/chat.ts`
**Purpose**: Chat completion utilities
**Features**:
- Message formatting
- Context management
- Streaming response handling

#### `lib/ai/prompts.ts`
**Purpose**: RAG prompt templates
**Features**:
- Context-aware prompt construction
- Source attribution
- Technical term emphasis

### UI Components

#### Chat Components
- **`chat-window.tsx`**: Main interface with error boundaries
- **`chat-message.tsx`**: Markdown rendering with role-based styling
- **`chat-input.tsx`**: Input handling with keyboard shortcuts

#### Document Components
- **`document-list.tsx`**: Grid display with empty states
- **`document-card.tsx`**: Status display with processing info
- **`upload-form.tsx`**: Multi-stage upload with progress

#### Layout Components
- **`header.tsx`**: User menu and navigation
- **`sidebar.tsx`**: Route navigation with active states

#### Debug Components
- **`debug-panel.tsx`**: System diagnostics and testing
- **`debug-overlay.tsx`**: Development-time debugging tools
- **`storage-cleanup.tsx`**: Storage management interface

---

## API Routes

All API routes use Edge Runtime and require authentication via `requireAuth()` from `lib/auth-server.ts`.

### Chat API (`/api/chat`)
**Purpose**: Main RAG endpoint for chat functionality
**Method**: POST
**Features**:
- Generates embeddings for user queries
- Searches Pinecone for relevant context
- Builds prompts with retrieved chunks
- Streams GPT-4o responses
- Source attribution in responses

**Request Body**:
\`\`\`typescript
{
  messages: Array<{
    role: "user" | "assistant"
    content: string
  }>
}
\`\`\`

**Response**: Streaming text with source citations

### Document APIs

#### Upload API (`/api/documents/upload`)
**Purpose**: Handles file uploads to Vercel Blob
**Method**: POST
**Features**:
- Validates file types (Markdown, Text, PDF, HTML)
- Uploads with private access
- Returns blob URL for processing

#### Process API (`/api/documents/process`)
**Purpose**: Processes uploaded documents
**Method**: POST
**Features**:
- Semantic chunking with metadata
- Batch embedding generation
- Vector storage in Pinecone
- Real-time progress via Server-Sent Events

#### Document CRUD (`/api/documents`)
**Methods**: GET, DELETE
**Features**:
- List all documents with metadata
- Delete documents and associated vectors
- Cleanup orphaned data

### Search API (`/api/search`)
**Purpose**: Direct vector search without chat
**Method**: POST
**Features**:
- Query embedding generation
- Vector similarity search
- Keyword matching
- Result ranking and deduplication

### Settings API (`/api/settings`)
**Purpose**: RAG configuration management
**Methods**: GET, POST
**Features**:
- Retrieve current settings
- Update RAG parameters
- Validate configuration values

### Health APIs

#### System Health (`/api/health`)
**Purpose**: Overall system health monitoring
**Method**: GET
**Features**:
- Service connectivity tests
- Environment validation
- Performance metrics
- Timestamp tracking

#### Storage Health (`/api/health/storage`)
**Purpose**: Storage-specific health checks
**Method**: GET
**Features**:
- Pinecone connectivity and stats
- Vercel KV status and usage
- Blob storage accessibility
- Cleanup recommendations

### Debug APIs

#### System Debug (`/api/debug`)
**Purpose**: Comprehensive system diagnostics
**Method**: GET
**Features**:
- Environment variable status
- Service connectivity tests
- Performance benchmarks
- Configuration validation

#### Cleanup API (`/api/debug/cleanup`)
**Purpose**: Storage cleanup utilities
**Method**: POST
**Features**:
- Remove orphaned KV entries
- Clean up processing states
- Garbage collection for expired data

---

## Authentication System

### Architecture Overview
The authentication system uses a split architecture to ensure Edge Runtime compatibility:

1. **Server-side** (`lib/auth-server.ts`): API route authentication
2. **Client-side** (`lib/auth-client.ts`): React component authentication
3. **Hook** (`lib/hooks/use-auth.ts`): Auth state management

### Authentication Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Supabase
    
    User->>Client: Enter credentials
    Client->>Supabase: signIn()
    Supabase->>Client: Session cookie
    Client->>API: Request with cookie
    API->>Supabase: Validate session
    Supabase->>API: User data
    API->>Client: Protected response
\`\`\`

### Usage Patterns

#### In API Routes
\`\`\`typescript
import { requireAuth } from "../../../lib/auth-server"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    // Protected logic here
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }
}
\`\`\`

#### In Client Components
\`\`\`typescript
import { useAuth } from "@/lib/hooks/use-auth"

export function MyComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  if (!user) return <LoginPrompt />
  
  return <AuthenticatedContent />
}
\`\`\`

---

## Database & Storage

### Pinecone Vector Database
- **Index**: Serverless with 3072 dimensions
- **Metric**: Cosine similarity
- **Metadata**: Rich document metadata for filtering
- **Namespaces**: Document separation and organization

### Vercel Blob Storage
- **Access**: Private with signed URLs
- **File Types**: Markdown, Text, PDF, HTML
- **Organization**: Logical folder structure
- **Cleanup**: Automatic orphan detection

### Vercel KV Storage
- **Purpose**: Metadata and state management
- **TTL**: Automatic expiration for temporary data
- **Keys**: Structured naming conventions
- **Cleanup**: Regular garbage collection

### Supabase Authentication
- **Mode**: Single-user system
- **Method**: Email/password authentication
- **Sessions**: Cookie-based with automatic refresh
- **Security**: Secure cookie handling

---

## Configuration

### Environment Variables

#### Required Variables
\`\`\`bash
# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your_openai_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=llmgraph-ue
PINECONE_HOST=your-index.svc.region.pinecone.io

# Vercel Storage
BLOB_READ_WRITE_TOKEN=your_blob_token
KV_REST_API_URL=https://your-kv.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token

# Optional Debug
NEXT_PUBLIC_DEBUG=true
\`\`\`

#### Environment Validation
The system validates environment variables in groups:
- **SUPABASE**: Authentication variables
- **OPENAI**: AI model access
- **PINECONE**: Vector database
- **VERCEL_BLOB**: Document storage
- **VERCEL_KV**: Metadata storage

### Next.js Configuration
\`\`\`javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  
  // Edge Runtime polyfills
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      config.resolve.fallback = {
        fs: false, path: false, stream: false,
        crypto: false, http: false, https: false,
        os: false, url: false, zlib: false,
        querystring: false, buffer: false,
        util: false, assert: false, events: false,
      }
    }
    return config
  },
}
\`\`\`

### Tailwind Configuration
- **Design System**: shadcn/ui compatible
- **Dark Mode**: Class-based switching
- **Responsive**: Mobile-first approach
- **Animations**: Smooth transitions and loading states

---

## Development Workflow

### Setup Process
1. **Clone Repository**
   \`\`\`bash
   git clone <repository-url>
   cd llmgraph-ue
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment**
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your values
   \`\`\`

4. **Setup Services**
   - Create Supabase project
   - Create Pinecone serverless index
   - Configure Vercel storage

5. **Start Development**
   \`\`\`bash
   npm run dev
   \`\`\`

### Development Guidelines

#### Import Patterns
- **API Routes**: Use relative imports (Edge Runtime requirement)
- **Client Components**: Can use path aliases (`@/`)
- **Shared Logic**: Place in `/lib` directory only

#### Authentication Patterns
- **API Routes**: Always use `requireAuth()` from `lib/auth-server.ts`
- **Client Components**: Use `useAuth()` hook from `lib/hooks/use-auth.ts`
- **Route Protection**: Implement in layout components

#### Error Handling
- **API Routes**: Consistent error responses with status codes
- **Client Components**: Error boundaries for graceful degradation
- **User Feedback**: Toast notifications for user actions

#### Testing Strategy
- **Health Checks**: Use `/api/health` endpoints
- **Debug Tools**: Use `/api/debug` for diagnostics
- **Manual Testing**: Use debug panel in dashboard

### Code Quality
- **TypeScript**: Full type coverage
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Error Boundaries**: Robust error handling

---

## Deployment Guide

### Vercel Deployment

#### Prerequisites
- Vercel account
- GitHub repository
- Environment variables configured

#### Deployment Steps
1. **Connect Repository**
   - Import project from GitHub
   - Select framework: Next.js

2. **Configure Environment**
   - Add all required environment variables
   - Verify variable names and values

3. **Deploy**
   - Automatic deployment on push
   - Edge Runtime optimization
   - Global CDN distribution

#### Post-Deployment
- Verify health endpoints
- Test authentication flow
- Validate document processing
- Monitor performance metrics

### Production Considerations

#### Performance Optimization
- **Edge Runtime**: Sub-100ms API responses
- **Caching**: KV-based query result caching
- **Streaming**: Real-time updates
- **CDN**: Global asset distribution

#### Security Measures
- **Authentication**: Secure session management
- **Input Validation**: All user inputs validated
- **Rate Limiting**: API quota management
- **Error Handling**: No sensitive data exposure

#### Monitoring
- **Health Checks**: Automated system monitoring
- **Debug Endpoints**: System diagnostics
- **Performance Metrics**: Response time tracking
- **Error Logging**: Structured error reporting

---

## Troubleshooting

### Common Issues

#### Authentication Problems
**Symptoms**: Login failures, unauthorized errors
**Solutions**:
- Verify Supabase environment variables
- Check cookie settings and domain
- Validate user exists in Supabase Auth

#### Vector Search Issues
**Symptoms**: No search results, embedding errors
**Solutions**:
- Verify Pinecone API key and host
- Check index dimensions (must be 3072)
- Validate document processing completion

#### Document Processing Failures
**Symptoms**: Upload succeeds but processing fails
**Solutions**:
- Check OpenAI API key and quota
- Verify Pinecone connectivity
- Monitor processing logs in debug panel

#### Edge Runtime Errors
**Symptoms**: Build failures, import errors
**Solutions**:
- Use relative imports in API routes
- Avoid Node.js-specific modules
- Check webpack configuration

### Debug Tools

#### Health Check Endpoints
- `/api/health`: Overall system status
- `/api/health/storage`: Storage-specific checks
- `/api/debug`: Comprehensive diagnostics

#### Debug Panel
- Access via `/dashboard/debug`
- System health monitoring
- Storage cleanup tools
- Performance metrics

#### Debug Overlay
- Enable with `NEXT_PUBLIC_DEBUG=true`
- Development-time diagnostics
- Real-time error reporting
- Performance monitoring

### Performance Optimization

#### API Response Times
- Target: <100ms for Edge Runtime
- Monitor via health endpoints
- Optimize database queries
- Use caching strategies

#### Document Processing
- Batch size optimization
- Progress tracking accuracy
- Error recovery mechanisms
- Memory usage monitoring

#### Vector Search
- Query optimization
- Result caching
- Fallback strategies
- Performance benchmarking

---

## Conclusion

LLMGraph-UE provides a robust, scalable platform for RAG-based document search and AI chat. The architecture emphasizes performance, security, and maintainability while leveraging modern serverless technologies.

For additional support or questions, refer to the specific documentation files in the `/docs` directory or use the built-in debug tools for system diagnostics.
