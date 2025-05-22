# Pinecone REST Client for Edge Runtime

This document explains the implementation of the custom Pinecone REST client used in this project to ensure Edge Runtime compatibility.

## Background

The official Pinecone SDK has dependencies on Node.js modules like `stream`, which are not available in Edge Runtime environments like Vercel Edge Functions. This caused build errors when deploying the application.

## Solution

We implemented a custom REST client that:

1. Uses only the native `fetch` API available in Edge Runtime
2. Provides the same core functionality as the Pinecone SDK
3. Implements retry logic with exponential backoff
4. Has no dependencies on Node.js-specific modules

## Implementation Details

The REST client is implemented in `lib/pinecone/rest-client.ts` and provides the following key methods:

- `query`: Search for similar vectors
- `upsert`: Add or update vectors
- `delete`: Remove vectors by ID or filter
- `listIndexes`: List available indexes (simplified implementation)
- `describeIndexStats`: Get statistics about the index

## Configuration

The REST client requires the following environment variables:

- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX_NAME`: The name of your Pinecone index
- `PINECONE_HOST`: The host URL for your Pinecone index (e.g., `my-index-abc123.svc.us-east-1-aws.pinecone.io`)

## Usage

The REST client is used through the singleton pattern implemented in `lib/pinecone/client.ts`:

\`\`\`typescript
import { createClient } from "../lib/pinecone/client"

// Get the client
const pinecone = createClient()

// Query vectors
const results = await pinecone.query({
  vector: embedding,
  topK: 5,
  includeMetadata: true
})
\`\`\`

## Error Handling

The client implements comprehensive error handling:

1. All API calls use the retry utility in `lib/pinecone/retry.ts`
2. Exponential backoff is applied for transient errors
3. Detailed error messages include HTTP status codes and response text

## Advantages Over the SDK

1. **Edge Compatibility**: Works in all Edge Runtime environments
2. **Simplified Dependencies**: No external dependencies
3. **Reduced Bundle Size**: Smaller deployment package
4. **Better Error Messages**: More detailed error information
5. **Focused Implementation**: Only includes the features we need

## Maintenance

When updating the application, keep these points in mind:

1. The REST client uses the Pinecone API directly, so check the [Pinecone API documentation](https://docs.pinecone.io/reference) for any changes
2. If new Pinecone features are needed, they can be added to the REST client
3. The retry logic can be adjusted in `lib/pinecone/retry.ts` if needed
