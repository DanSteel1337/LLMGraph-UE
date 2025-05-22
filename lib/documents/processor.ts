/**
 * Purpose: Document processing pipeline
 * Logic:
 * - Orchestrates document processing
 * - Chunks documents, generates embeddings, stores vectors
 * Runtime context: Edge Function
 * Services: OpenAI (for embeddings), Pinecone (for vector storage)
 */
import { chunkDocument } from "./chunker"
import { createEmbeddingBatch } from "../ai/embeddings"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"

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
  vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, any>
  }>
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

  // Generate embeddings
  const texts = chunks.map((chunk) => chunk.text)
  const embeddings = await createEmbeddingBatch(texts)

  // Create vectors
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
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
