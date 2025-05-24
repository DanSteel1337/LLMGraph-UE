# LLMGraph-UE: Serverless RAG Dashboard

A production-ready serverless RAG (Retrieval-Augmented Generation) dashboard for UE5.4 API documentation, built with Next.js App Router, Supabase, Pinecone, and the Vercel AI SDK.

## 🏗️ Architecture

### **Core Technologies**
- **Framework**: Next.js 15 with App Router
- **Runtime**: Vercel Edge Runtime for optimal performance
- **Authentication**: Supabase Auth with singleton pattern
- **Vector Database**: Pinecone Serverless (3072-dim embeddings)
- **AI Models**: OpenAI GPT-4 + text-embedding-3-large
- **Storage**: Vercel Blob + Vercel KV
- **UI**: Tailwind CSS + shadcn/ui components

### **Authentication Architecture**
- **Server-side**: `lib/auth.ts` - Single source of truth for API routes
- **Client-side**: `lib/auth-client.ts` - React hook for components
- **Pattern**: All API routes use `validateAuth()` → `unauthorizedResponse()`
- **Security**: Singleton pattern prevents auth logic duplication

### **Edge Runtime Compatibility**
- All API routes use relative imports (not `@/` aliases)
- Custom Pinecone REST client (no SDK dependency)
- Optimized for Vercel Edge Runtime performance

## 🚀 Features

### **Document Processing**
- **Smart Chunking**: Semantic chunking with 200-500 tokens for text, 750-1500 for code
- **Rich Metadata**: Source tracking, timestamps, document hierarchy
- **Batch Processing**: Handles 20-50 chunk batches within Edge Runtime limits
- **Progress Streaming**: Real-time processing updates via Server-Sent Events

### **Vector Search**
- **Hybrid Search**: Vector similarity + keyword matching
- **Technical Weighting**: Enhanced relevance for domain terminology
- **Deduplication**: Intelligent result deduplication by document ID
- **Fallback Handling**: Graceful degradation for low-confidence results

### **AI Chat Interface**
- **Streaming Responses**: Real-time AI responses with context
- **Source Attribution**: Clear citation of source documents
- **Context Management**: Optimal context window utilization
- **Error Boundaries**: Robust error handling and recovery

### **Debug & Monitoring**
- **System Health**: Comprehensive health check endpoints
- **Vector Analytics**: Track embeddings and search performance
- **KV Cleanup**: Automated cleanup of orphaned entries
- **Debug Overlay**: Development-time diagnostics

## 📁 Project Structure

\`\`\`
llmgraph-ue/
├── app/
│   ├── api/                       # Edge Runtime API routes
│   │   ├── chat/                  # AI chat completions
│   │   ├── documents/             # Document CRUD operations
│   │   ├── search/                # Vector search
│   │   ├── settings/              # RAG configuration
│   │   └── debug/                 # System diagnostics
│   ├── auth/                      # Authentication pages
│   ├── dashboard/                 # Main application
│   └── components/                # React components
├── lib/
│   ├── auth.ts                    # Server-side auth singleton
│   ├── auth-client.ts             # Client-side auth hook
│   ├── ai/                        # AI utilities (embeddings, chat, prompts)
│   ├── documents/                 # Document processing pipeline
│   ├── pinecone/                  # Vector database operations
│   └── utils/                     # Shared utilities
└── components/ui/                 # shadcn/ui components
\`\`\`

## 🔧 Setup & Configuration

### **Environment Variables**
\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
PINECONE_HOST=your_pinecone_host

# Vercel Storage
BLOB_READ_WRITE_TOKEN=your_blob_token
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
\`\`\`

### **Pinecone Setup**
1. Create a serverless index with **3072 dimensions**
2. Use **cosine** similarity metric
3. Configure for **AWS us-east-1** region
4. Enable metadata indexing for optimal filtering

### **Installation**
\`\`\`bash
npm install
npm run dev
\`\`\`

## 🔒 Security Features

- **Single-user authentication** with Supabase
- **Edge Runtime security** with proper cookie handling
- **Input validation** for all file uploads and API requests
- **Rate limiting** and quota management
- **Secure blob storage** with public read access

## 📊 Performance Optimizations

- **Edge Runtime**: Sub-100ms API response times
- **Vector Caching**: KV-based query result caching
- **Batch Processing**: Optimized embedding generation
- **Streaming**: Real-time document processing updates
- **CDN Integration**: Global blob storage distribution

## 🛠️ Development

### **Key Patterns**
- **Auth**: Always use singleton pattern from `lib/auth.ts` or `lib/auth-client.ts`
- **Imports**: Use relative imports in Edge Runtime files
- **Error Handling**: Consistent error responses across all routes
- **Type Safety**: Full TypeScript coverage with proper interfaces

### **Debug Mode**
Set `NEXT_PUBLIC_DEBUG=true` for enhanced logging and error details.

## 📚 Documentation

- [Authentication Architecture](docs/AUTH_LOCKED.md)
- [Pinecone REST Client](docs/PINECONE_REST_CLIENT.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)

## 🚀 Deployment

Deploy to Vercel with one click:
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy with automatic Edge Runtime optimization

---

**Built with ❤️ for the Unreal Engine community**
\`\`\`

### **Step 4: Update Authentication Documentation**
