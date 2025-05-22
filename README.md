# LLMGraph-UE: Serverless RAG Dashboard

A serverless RAG (Retrieval-Augmented Generation) dashboard for API documentation, built with Next.js, Supabase, Pinecone, and the Vercel AI SDK.

## Features

- **Serverless Architecture**: Built on Next.js App Router and Edge Runtime
- **Vector Search**: Semantic search with Pinecone Serverless
- **Document Processing**: Automatic chunking and embedding of documentation
- **Chat Interface**: AI-powered chat with context from your documentation
- **Authentication**: Secure, singleton-based Supabase authentication

## Authentication System

The authentication system has been finalized and locked. See [AUTH_LOCKED.md](docs/AUTH_LOCKED.md) for details on the implementation and why it should not be modified.

## Getting Started

1. Clone the repository
2. Set up the required environment variables
3. Run `npm install`
4. Run `npm run dev`

## Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX_NAME`: Your Pinecone index name
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob read/write token
- `KV_REST_API_URL`: Your Vercel KV REST API URL
- `KV_REST_API_TOKEN`: Your Vercel KV REST API token

## Project Structure

- `app/`: Next.js App Router pages and components
- `lib/`: Utility functions and services
  - `ai/`: AI-related utilities (embeddings, prompts)
  - `auth/`: Authentication utilities
  - `documents/`: Document processing utilities
  - `pinecone/`: Pinecone client and search utilities
  - `storage/`: Vercel Blob and KV utilities
  - `utils/`: General utilities
- `middleware.ts`: Authentication middleware
- `docs/`: Project documentation

## License

MIT
