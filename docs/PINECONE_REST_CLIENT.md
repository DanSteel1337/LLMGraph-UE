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
5. **Uses OpenAI text-embedding-3-large (3072 dimensions) consistently**

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

**Important**: The `PINECONE_HOST` should NOT include the protocol (https://). The client will add it automatically.

## Embedding Model Configuration

This implementation is specifically configured for **OpenAI text-embedding-3-large**:

- **Model**: `text-embedding-3-large`
- **Dimensions**: `3072`
- **Index Configuration**: The Pinecone index must be created with 3072 dimensions

### Creating the Pinecone Index

When creating your Pinecone index, ensure it's configured for 3072 dimensions:

\`\`\`typescript
await pc.createIndex({
  name: indexName,
  dimension: 3072, // For text-embedding-3-large
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
});
\`\`\`

## Usage

The REST client is used through the singleton pattern implemented in `lib/pinecone/client.ts`:

\`\`\`typescript
import { createClient } from "../lib/pinecone/client"

// Get the client
const pinecone = createClient()

// Query vectors
const results = await pinecone.query({
  vector: embedding, // Must be 3072-dimensional
  topK: 5,
  includeMetadata: true
})
\`\`\`

## Error Handling

The client implements comprehensive error handling:

1. All API calls use the retry utility in `lib/pinecone/retry.ts`
2. Exponential backoff is applied for transient errors
3. Detailed error messages include HTTP status codes and response text
4. **Dimension validation** ensures all vectors are 3072-dimensional

## Advantages Over the SDK

1. **Edge Compatibility**: Works in all Edge Runtime environments
2. **Simplified Dependencies**: No external dependencies
3. **Reduced Bundle Size**: Smaller deployment package
4. **Better Error Messages**: More detailed error information
5. **Focused Implementation**: Only includes the features we need
6. **Consistent Embedding Model**: Enforces text-embedding-3-large usage

## Maintenance

When updating the application, keep these points in mind:

1. The REST client uses the Pinecone API directly, so check the [Pinecone API documentation](https://docs.pinecone.io/reference) for any changes
2. If new Pinecone features are needed, they can be added to the REST client
3. The retry logic can be adjusted in `lib/pinecone/retry.ts` if needed
4. **Always use text-embedding-3-large (3072 dimensions)** for consistency
5. Validate embedding dimensions in all vector operations

## Troubleshooting

### Dimension Mismatch Errors

If you see errors like "Vector dimension X does not match the dimension of the index Y":

1. Verify your Pinecone index is configured for 3072 dimensions
2. Ensure all embedding generation uses `text-embedding-3-large`
3. Check that no legacy code is using smaller embedding models
4. Validate that test vectors use real embeddings, not random values

### Common Issues

- **403 Errors**: Check API key and host configuration
- **400 Dimension Errors**: Ensure all vectors are 3072-dimensional
- **Network Errors**: Verify host URL format (no protocol prefix)
