/**
 * Purpose: Document processing pipeline
 * Logic:
 * - Orchestrates document processing
 * - Chunks documents, generates embeddings, stores vectors
 * - Ensures all embeddings use text-embedding-3-large (3072 dimensions)
 * Runtime context: Edge Function
 * Services: OpenAI (for embeddings), Pinecone (for vector storage)
 */
import { chunkDocument } from "./chunker"
import { createEmbeddingBatch, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../ai/embeddings"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"
import type { PineconeVector } from "../pinecone/types"

export async function processDocument(
  documentId: string,
  content: string,
  filename: string,
  type: string,
): Promise<{
  chunks: Array<{
    id: string
    text: string
    metadata: Record<string, any>
  }>
  vectors: PineconeVector[]
}> {
  // Get settings from KV or use defaults
  const settings = (await kv.get("settings")) || {
    chunkSize: {
      text: 300,
      code: 1000,
    },
  }

  // Update processing status
  await kv.set(`document:${documentId}:status`, "chunking")

  // Chunk document
  const chunks = chunkDocument(documentId, content, filename, type, {
    chunkSize: settings.chunkSize,
  })

  // Update processing status
  await kv.set(`document:${documentId}:status`, "embedding")
  await kv.set(`document:${documentId}:chunks`, chunks.length)

  // Generate embeddings using text-embedding-3-large
  const texts = chunks.map((chunk) => chunk.text)
  const embeddings = await createEmbeddingBatch(texts)

  // Validate all embeddings have correct dimensions
  for (let i = 0; i < embeddings.length; i++) {
    if (embeddings[i].length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding ${i} has incorrect dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embeddings[i].length}`,
      )
    }
  }

  // Create vectors
  const vectors: PineconeVector[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
  }))

  // Update processing status
  await kv.set(`document:${documentId}:status`, "storing")
  await kv.set(`document:${documentId}:vectors`, vectors.length)

  // Store vectors in Pinecone
  const pinecone = createClient()

  // Upsert vectors in batches
  const batchSize = 50 // Changed from 100 to 50 to comply with Edge function limits
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize)
    await pinecone.upsert(batch)
  }

  // Update processing status
  await kv.set(`document:${documentId}:status`, "completed")

  return { chunks, vectors }
}
