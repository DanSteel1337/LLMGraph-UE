# LLMGraph-UE: Serverless RAG Dashboard

A serverless RAG (Retrieval-Augmented Generation) dashboard for API documentation, built with Next.js, Supabase, Pinecone, and the Vercel AI SDK.

## Features

- **Serverless Architecture**: Built on Next.js App Router and Edge Runtime
- **Vector Search**: Semantic search with Pinecone using Edge-compatible REST client
- **Document Processing**: Automatic chunking and embedding of documentation
- **Chat Interface**: AI-powered chat with context from your documentation
- **Authentication**: Secure, singleton-based Supabase authentication

## Pinecone Implementation

This project uses a custom Edge-compatible REST client for Pinecone instead of the official SDK to ensure compatibility with Vercel Edge Runtime. See [PINECONE_REST_CLIENT.md](docs/PINECONE_REST_CLIENT.md) for details.
\`\`\`

### 7. Update .gitignore to Exclude Pinecone SDK

Let's update the .gitignore file to exclude any Pinecone SDK files that might be present:

```text file=".gitignore" type="partial"
# Pinecone SDK (we use our own REST client)
node_modules/@pinecone-database
