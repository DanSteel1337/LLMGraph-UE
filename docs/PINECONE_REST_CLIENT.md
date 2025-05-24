# Pinecone REST Client - Edge Runtime Compatible

## Overview

LLMGraph-UE uses a **custom Pinecone REST client** instead of the official SDK to ensure **Edge Runtime compatibility**. The official Pinecone SDK uses Node.js modules that are incompatible with Vercel's Edge Runtime.

## Architecture

### **Why REST Client?**
- **Edge Runtime**: Official SDK uses Node.js modules
- **Performance**: Direct HTTP calls are faster
- **Bundle Size**: Smaller than full SDK
- **Control**: Custom retry logic and error handling

### **Implementation Location**
\`\`\`
lib/pinecone/
├── rest-client.ts     # Core REST client implementation
├── client.ts          # Singleton client instance
├── search.ts          # Vector search operations
└── types.ts           # TypeScript interfaces
\`\`\`

## Features

### **Core Operations**
- ✅ **Query**: Vector similarity search with metadata filtering
- ✅ **Upsert**: Batch vector insertion with metadata
- ✅ **Delete**: Vector deletion by ID or metadata filter
- ✅ **Stats**: Index statistics and health checks

### **Edge Runtime Optimizations**
- **Singleton Pattern**: Single client instance across requests
- **Retry Logic**: Exponential backoff for failed requests
- **Error Handling**: Structured error responses
- **Batch Processing**: Optimized for Edge Runtime limits

## Configuration

### **Environment Variables**
\`\`\`bash
PINECONE_API_KEY=your_api_key
PINECONE_INDEX_NAME=your_index_name
PINECONE_HOST=your_pinecone_host
\`\`\`

### **Index Requirements**
- **Dimensions**: 3072 (for text-embedding-3-large)
- **Metric**: Cosine similarity
- **Type**: Serverless (recommended)
- **Region**: us-east-1 (optimal for Vercel)

## Usage Examples

### **Vector Search**
\`\`\`typescript
import { searchVectors } from "../../../lib/pinecone/search"

const embedding = await createEmbedding(query)
const results = await searchVectors(embedding, 5)
\`\`\`

### **Document Indexing**
\`\`\`typescript
import { upsertVectors } from "../../../lib/pinecone/client"

await upsertVectors(vectors, {
  documentId: "doc-123",
  source: "api-docs",
  timestamp: new Date().toISOString()
})
\`\`\`

## Performance Characteristics

### **Latency**
- **Query**: ~50-100ms average
- **Upsert**: ~100-200ms for 100 vectors
- **Delete**: ~50ms average

### **Throughput**
- **Batch Size**: 100 vectors max per upsert
- **Concurrent**: 10 parallel requests max
- **Rate Limits**: Handled with exponential backoff

## Error Handling

### **Retry Strategy**
\`\`\`typescript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}
\`\`\`

### **Error Types**
- **Network**: Connection failures, timeouts
- **API**: Rate limits, invalid requests
- **Data**: Dimension mismatches, invalid vectors

## Monitoring

### **Health Checks**
- Index statistics endpoint
- Connection validation
- Performance metrics

### **Debug Logging**
Set `NEXT_PUBLIC_DEBUG=true` for detailed request/response logging.

## Migration from SDK

### **Before (SDK)**
\`\`\`typescript
import { Pinecone } from '@pinecone-database/pinecone'

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
const index = pc.index('my-index')
\`\`\`

### **After (REST Client)**
\`\`\`typescript
import { getPineconeClient } from '../../../lib/pinecone/client'

const client = getPineconeClient()
const results = await client.query(...)
\`\`\`

This REST client provides **full Pinecone functionality** while maintaining **Edge Runtime compatibility** and **optimal performance**.
\`\`\`

### **Step 6: Create Complete Project Structure Documentation**
