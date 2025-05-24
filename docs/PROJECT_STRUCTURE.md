# Complete Project Structure

## Overview
LLMGraph-UE follows a **clean architecture** pattern with clear separation of concerns and **Edge Runtime optimization**.

## Directory Structure

\`\`\`
llmgraph-ue/
├── README.md                      # Main project documentation
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── middleware.ts                  # Next.js middleware
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
│
├── app/                           # Next.js App Router
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   │
│   ├── auth/                      # Authentication pages
│   │   ├── layout.tsx             # Auth layout wrapper
│   │   ├── login/page.tsx         # Login page
│   │   └── callback/route.ts      # OAuth callback handler
│   │
│   ├── dashboard/                 # Main application
│   │   ├── layout.tsx             # Dashboard layout
│   │   ├── page.tsx               # Chat interface
│   │   ├── documents/page.tsx     # Document management
│   │   ├── settings/page.tsx      # RAG configuration
│   │   └── debug/page.tsx         # System diagnostics
│   │
│   ├── components/                # React components
│   │   ├── auth/
│   │   │   └── auth-form.tsx      # Login form component
│   │   ├── chat/
│   │   │   ├── chat-window.tsx    # Main chat interface
│   │   │   ├── chat-input.tsx     # Message input
│   │   │   └── chat-message.tsx   # Message display
│   │   ├── documents/
│   │   │   ├── document-list.tsx  # Document listing
│   │   │   ├── document-card.tsx  # Document display
│   │   │   └── upload-form.tsx    # File upload
│   │   ├── layout/
│   │   │   ├── header.tsx         # App header
│   │   │   └── sidebar.tsx        # Navigation sidebar
│   │   ├── settings/
│   │   │   └── settings-form.tsx  # RAG parameters
│   │   ├── debug/
│   │   │   ├── debug-panel.tsx    # System diagnostics
│   │   │   └── debug-overlay.tsx  # Debug overlay
│   │   └── ui/
│   │       ├── error-boundary.tsx # Error handling
│   │       ├── auth-loading.tsx   # Auth loading state
│   │       └── custom-badge.tsx   # Status badges
│   │
│   └── api/                       # Edge Runtime API routes
│       ├── chat/route.ts          # AI chat completions
│       ├── search/route.ts        # Vector search
│       ├── settings/route.ts      # Configuration CRUD
│       ├── health/route.ts        # System health checks
│       ├── documents/
│       │   ├── route.ts           # Document CRUD
│       │   ├── upload/route.ts    # File upload handler
│       │   └── process/route.ts   # Document processing
│       └── debug/
│           ├── route.ts           # Debug information
│           └── cleanup/route.ts   # KV cleanup utilities
│
├── lib/                           # Shared utilities (SINGLE SOURCE)
│   ├── auth.ts                    # Authentication validation
│   ├── auth-client.ts             # Client-side auth hook
│   ├── auth-singleton.ts          # Supabase client singleton
│   ├── route-guards.ts            # Protected route utilities
│   │
│   ├── ai/                        # AI utilities
│   │   ├── chat.ts                # Chat completions
│   │   ├── embeddings.ts          # Text embeddings
│   │   └── prompts.ts             # RAG prompt templates
│   │
│   ├── documents/                 # Document processing
│   │   ├── processor.ts           # Main processing pipeline
│   │   ├── chunker.ts             # Semantic chunking
│   │   └── storage.ts             # Document storage (KV + Blob)
│   │
│   ├── pinecone/                  # Vector database
│   │   ├── rest-client.ts         # Edge-compatible REST client
│   │   ├── client.ts              # Singleton client instance
│   │   ├── search.ts              # Vector search operations
│   │   └── types.ts               # TypeScript interfaces
│   │
│   └── utils/                     # Shared utilities
│       ├── env.ts                 # Environment validation
│       ├── debug.ts               # Debug utilities
│       ├── retry.ts               # Retry logic
│       ├── cleanup.ts             # KV cleanup
│       ├── blob-fetch.ts          # Blob storage utilities
│       └── index.ts               # Utility exports
│
├── components/ui/                 # shadcn/ui components
│   ├── button.tsx                 # Button component
│   ├── input.tsx                  # Input component
│   ├── card.tsx                   # Card component
│   ├── tabs.tsx                   # Tabs component
│   ├── skeleton.tsx               # Loading skeleton
│   ├── progress.tsx               # Progress bar
│   ├── label.tsx                  # Form label
│   ├── toast.tsx                  # Toast notification
│   └── toaster.tsx                # Toast container
│
├── hooks/                         # React hooks
│   └── use-toast.ts               # Toast hook
│
├── docs/                          # Documentation
│   ├── AUTH_LOCKED.md             # Authentication architecture
│   ├── PINECONE_REST_CLIENT.md    # Vector database setup
│   └── PROJECT_STRUCTURE.md       # This file
│
└── types/                         # TypeScript types
    └── supabase.ts                # Supabase type definitions
\`\`\`

## Key Architectural Decisions

### **1. Authentication Architecture**
- **Server**: `lib/auth.ts` - API route authentication with `validateAuth()` and `unauthorizedResponse()`
- **Client**: `lib/auth-client.ts` - React component authentication with `useAuth()` hook
- **Route Protection**: `lib/route-guards.ts` - Client-side route protection with `useProtectedRoute()`
- **Pattern**: Consistent auth validation across all API routes

### **2. Edge Runtime Compatibility**
- **API Routes**: All use `export const runtime = "edge"`
- **Imports**: Relative imports (not `@/` aliases) in Edge files
- **Dependencies**: Custom REST clients instead of Node.js SDKs

### **3. Document Processing Pipeline**
- **Upload**: Vercel Blob storage with public access
- **Processing**: Semantic chunking with metadata
- **Indexing**: Pinecone vector storage with rich metadata
- **State**: Vercel KV for processing status and caching

### **4. Component Organization**
- **Feature-based**: Components grouped by functionality
- **Reusable**: shadcn/ui components for consistency
- **Error Boundaries**: Robust error handling throughout

### **5. Type Safety**
- **Full Coverage**: TypeScript throughout the codebase
- **Interfaces**: Clear contracts between components
- **Validation**: Runtime validation for external data

## Import Patterns

### **API Routes (Edge Runtime)**
\`\`\`typescript
// ✅ Correct - Relative imports
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"
import { searchVectors } from "../../../lib/pinecone/search"

// ❌ Wrong - Path aliases break Edge Runtime
import { validateAuth } from "@/lib/auth"
\`\`\`

### **Client Components**
\`\`\`typescript
// ✅ Correct - Can use path aliases
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-client"

// ✅ Also correct - Relative imports
import { Button } from "../../../components/ui/button"
\`\`\`

## Authentication Pattern

### **API Route Pattern**
\`\`\`typescript
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // Validate authentication
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()
    
    // Your route logic here
    return Response.json({ data })
    
  } catch (error) {
    // Error handling
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
\`\`\`

### **Client Component Pattern**
\`\`\`typescript
// For auth state in components
import { useAuth } from "@/lib/auth-client"

export function MyComponent() {
  const { user, loading, signOut } = useAuth()
  
  if (loading) return <Skeleton />
  if (!user) return <Redirect to="/auth/login" />
  
  return <div>Welcome {user.email}</div>
}
\`\`\`

### **Protected Route Pattern**
\`\`\`typescript
// For protected routes
import { useProtectedRoute } from "@/lib/route-guards"

export default function ProtectedPage() {
  const { shouldRender, isLoading, user } = useProtectedRoute("/auth/login")
  
  if (isLoading) return <LoadingSpinner />
  if (!shouldRender) return null // Will redirect automatically
  
  return <YourComponent />
}
\`\`\`

## Performance Considerations

### **Bundle Optimization**
- **Tree Shaking**: Proper ES module exports
- **Code Splitting**: Route-based splitting
- **Edge Runtime**: Minimal bundle size for API routes

### **Caching Strategy**
- **Vector Results**: KV-based query caching
- **Document Metadata**: KV storage for fast access
- **Static Assets**: CDN caching for blob storage

This structure ensures **maintainability**, **performance**, and **Edge Runtime compatibility** while following Next.js best practices.
