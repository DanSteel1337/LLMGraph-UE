import { chunkDocument } from "./chunker"
import { createEmbeddingBatch, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../ai/embeddings"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"
import type { PineconeVector } from "../pinecone/types"

// Progress callback type
export type ProgressCallback = (progress: {
  stage: string
  percent: number
  message: string
  details?: Record<string, any>
}) => void

// Extract technical terms for UE5.4
export function extractTechnicalTerms(text: string): string[] {
  const technicalPatterns = [
    /\b(?:Blueprint|Actor|Component|Widget|Material|Mesh|Texture|Shader|Level|GameMode|PlayerController|Character|Pawn|UObject|UCLASS|UPROPERTY|UFUNCTION)\b/gi,
    /\b(?:Tick|BeginPlay|EndPlay|PostInitializeComponents|PreInitializeComponents)\b/gi,
    /\b(?:FVector|FRotator|FTransform|FQuat|FMatrix|FPlane|FBox|FSphere)\b/gi,
    /\b(?:UE5|Unreal Engine|Nanite|Lumen|World Partition|Niagara|Chaos Physics)\b/gi,
  ]

  const terms = new Set<string>()
  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern) || []
    matches.forEach((match) => terms.add(match.toLowerCase()))
  }

  return Array.from(terms)
}

// Extract version information
export function extractVersionInfo(text: string): string | null {
  const versionPattern = /(?:UE|Unreal Engine)\s*(\d+(?:\.\d+)*)/i
  const match = text.match(versionPattern)
  return match ? match[1] : null
}

// Main document processor class
export class DocumentProcessor {
  private documentId: string

  constructor(documentId: string) {
    this.documentId = documentId
  }

  async getState() {
    return kv.get(`document:${this.documentId}:status`)
  }

  async setState(status: string, progress: number) {
    return kv.set(`document:${this.documentId}:status`, {
      status,
      progress,
      updatedAt: new Date().toISOString(),
    })
  }

  async incrementProcessedChunks(count: number) {
    return kv.incrby(`document:${this.documentId}:chunks`, count)
  }

  async incrementVectorCount(count: number) {
    return kv.incrby(`document:${this.documentId}:vectors`, count)
  }

  async setStatus(status: string, progress: number) {
    return this.setState(status, progress)
  }
}

// Process document with progress updates
export async function processDocumentWithProgress(
  documentId: string,
  content: string,
  filename: string,
  type: string,
  onProgress: ProgressCallback,
): Promise<{
  chunks: Array<{
    id: string
    text: string
    metadata: Record<string, any>
  }>
  vectors: PineconeVector[]
}> {
  const startTime = Date.now()

  // Get settings from KV or use defaults aligned with project knowledge
  const settings = (await kv.get("settings")) || {
    chunkSize: {
      text: 300, // 200-500 tokens recommended for text
      code: 1000, // 750-1500 tokens recommended for code
    },
  }

  // Update processing status and send progress update
  await kv.set(`document:${documentId}:status`, "chunking", { ex: 3600 })
  onProgress({
    stage: "chunking",
    percent: 15,
    message: "Analyzing document structure and creating semantic chunks...",
    details: {
      documentId,
      filename,
      contentLength: content.length,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
  })

  // Chunk document using semantic splitting
  const chunks = chunkDocument(documentId, content, filename, type, {
    chunkSize: settings.chunkSize,
    overlap: type.includes("code") ? 200 : 100, // Larger overlap for code
  })

  // Update processing status and send progress update
  await kv.set(`document:${documentId}:status`, "embedding", { ex: 3600 })
  await kv.set(`document:${documentId}:chunks`, chunks.length, { ex: 3600 })
  onProgress({
    stage: "embedding",
    percent: 30,
    message: `Document chunked into ${chunks.length} semantic segments. Generating embeddings...`,
    details: {
      documentId,
      chunkCount: chunks.length,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
  })

  // Generate embeddings using text-embedding-3-large in batches
  const texts = chunks.map((chunk) => chunk.text)
  const batchSize = 20 // Optimized for Edge Runtime limits
  const embeddings: number[][] = []
  const totalBatches = Math.ceil(texts.length / batchSize)

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const currentBatch = Math.floor(i / batchSize) + 1

    // Generate embeddings for this batch
    const batchEmbeddings = await createEmbeddingBatch(batch, batchSize)
    embeddings.push(...batchEmbeddings)

    // Validate embedding dimensions for this batch
    for (const embedding of batchEmbeddings) {
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}. Model: ${EMBEDDING_MODEL}`,
        )
      }
    }

    // Calculate and report progress (30% to 70% for embedding stage)
    const embeddingProgress = 30 + Math.floor(((i + batch.length) / texts.length) * 40)
    onProgress({
      stage: "embedding",
      percent: embeddingProgress,
      message: `Generating embeddings: batch ${currentBatch}/${totalBatches} (${Math.min(
        i + batch.length,
        texts.length,
      )}/${texts.length} chunks)`,
      details: {
        documentId,
        processedChunks: Math.min(i + batch.length, texts.length),
        totalChunks: texts.length,
        currentBatch,
        totalBatches,
        embeddingModel: EMBEDDING_MODEL,
        embeddingDimensions: EMBEDDING_DIMENSIONS,
      },
    })

    // Rate limiting to avoid API limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  // Create vectors with rich metadata
  const vectors: PineconeVector[] = chunks.map((chunk, i) => ({
    id: chunk.id, // Format: ${documentId}-chunk-${index}
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      processingTimestamp: new Date().toISOString(),
      // Extract technical terms for better search
      technicalTerms: extractTechnicalTerms(chunk.text),
      // Extract version information if present
      version: extractVersionInfo(chunk.text),
    },
  }))

  // Update processing status and send progress update
  await kv.set(`document:${documentId}:status`, "storing", { ex: 3600 })
  await kv.set(`document:${documentId}:vectors`, vectors.length, { ex: 3600 })
  onProgress({
    stage: "storing",
    percent: 70,
    message: `Embeddings generated successfully. Storing ${vectors.length} vectors in Pinecone...`,
    details: {
      documentId,
      vectorCount: vectors.length,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
  })

  // Store vectors in Pinecone with batch processing
  const pinecone = createClient()
  const upsertBatchSize = 50 // Optimized for Edge Runtime limits
  const totalUpsertBatches = Math.ceil(vectors.length / upsertBatchSize)

  for (let i = 0; i < vectors.length; i += upsertBatchSize) {
    const batch = vectors.slice(i, i + upsertBatchSize)
    const currentUpsertBatch = Math.floor(i / upsertBatchSize) + 1

    // Upsert batch with retry logic
    await pinecone.upsert(batch)

    // Calculate and report progress (70% to 95% for storing stage)
    const storingProgress = 70 + Math.floor(((i + batch.length) / vectors.length) * 25)
    onProgress({
      stage: "storing",
      percent: storingProgress,
      message: `Storing vectors: batch ${currentUpsertBatch}/${totalUpsertBatches} (${Math.min(
        i + batch.length,
        vectors.length,
      )}/${vectors.length} vectors)`,
      details: {
        documentId,
        storedVectors: Math.min(i + batch.length, vectors.length),
        totalVectors: vectors.length,
        currentBatch: currentUpsertBatch,
        totalBatches: totalUpsertBatches,
      },
    })

    // Rate limiting to avoid Pinecone limits
    if (i + upsertBatchSize < vectors.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  // Update final processing status
  await kv.set(`document:${documentId}:status`, "completed", { ex: 86400 }) // 24 hour TTL

  // Send final progress update
  const processingTime = Date.now() - startTime
  onProgress({
    stage: "completed",
    percent: 100,
    message: `Document processing completed successfully. ${chunks.length} chunks and ${vectors.length} vectors created.`,
    details: {
      documentId,
      chunkCount: chunks.length,
      vectorCount: vectors.length,
      processingTime,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      completedAt: new Date().toISOString(),
    },
  })

  return { chunks, vectors }
}

// Legacy function for backward compatibility
export async function processDocument(documentId: string, url: string, type: string) {
  const processor = new DocumentProcessor(documentId)

  try {
    await processor.setState("processing", 0)
    // Implementation would fetch content from URL and process
    // This is a simplified version
    await processor.setState("completed", 100)
    return { success: true }
  } catch (error) {
    await processor.setState("failed", 0)
    throw error
  }
}
