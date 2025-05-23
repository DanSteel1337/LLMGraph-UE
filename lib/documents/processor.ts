/**
 * Document Processing Pipeline with Enhanced Error Tracking
 *
 * Purpose: Orchestrates document processing with real-time progress updates and comprehensive error tracking
 *
 * Features:
 * - Semantic chunking with configurable token sizes (200-500 text, 750-1500 code)
 * - Batch embedding generation using OpenAI text-embedding-3-large (3072 dimensions)
 * - Rich metadata extraction including headings, sections, and technical terms
 * - Vector storage in Pinecone with complete metadata
 * - Progress tracking with detailed stage reporting
 * - Technical term weighting for domain-specific terminology
 * - Version awareness for versioned documentation
 * - Enhanced error tracking with source map support
 *
 * Runtime context: Edge Function
 * Services: OpenAI (for embeddings), Pinecone (for vector storage), Vercel KV (for state)
 */

import { chunkDocument } from "./chunker"
import { createEmbeddingBatch, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../ai/embeddings"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"
import type { PineconeVector } from "../pinecone/types"
import { parseError, formatErrorForLogging, generateRequestId } from "../utils/edge-error-parser"
import { retry } from "../utils/retry"

export interface ProcessingProgress {
  stage: "initializing" | "fetching" | "analyzing" | "chunking" | "embedding" | "storing" | "completed" | "error"
  percent: number
  message: string
  details?: {
    documentId?: string
    filename?: string
    contentLength?: number
    chunkCount?: number
    vectorCount?: number
    processedChunks?: number
    totalChunks?: number
    storedVectors?: number
    totalVectors?: number
    currentBatch?: number
    totalBatches?: number
    embeddingModel?: string
    embeddingDimensions?: number
    processingTime?: number
    requestId?: string
  }
}

type ProgressCallback = (progress: ProcessingProgress) => void

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
  // Use the new function with a no-op progress callback
  return processDocumentWithProgress(documentId, content, filename, type, () => {})
}

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
  const requestId = generateRequestId()

  try {
    console.log(
      "Starting document processing:",
      JSON.stringify(
        {
          requestId,
          documentId,
          filename,
          type,
          contentLength: content.length,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

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
        requestId,
      },
    })

    // Chunk document using semantic splitting with error handling
    const chunks = await retry(
      () =>
        chunkDocument(documentId, content, filename, type, {
          chunkSize: settings.chunkSize,
          overlap: type.includes("code") ? 200 : 100, // Larger overlap for code
        }),
      {
        retries: 2,
        requestId,
        context: { operation: "document-chunking", documentId, filename },
      },
    )

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
        requestId,
      },
    })

    // Generate embeddings using text-embedding-3-large in batches with error handling
    const texts = chunks.map((chunk) => chunk.text)
    const batchSize = 20 // Optimized for Edge Runtime limits
    const embeddings: number[][] = []
    const totalBatches = Math.ceil(texts.length / batchSize)

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1

      try {
        // Generate embeddings for this batch with retry logic
        const batchEmbeddings = await retry(() => createEmbeddingBatch(batch, batchSize), {
          retries: 3,
          requestId,
          context: {
            operation: "embedding-generation",
            documentId,
            batchNumber: currentBatch,
            batchSize: batch.length,
          },
        })

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
          message: `Generating embeddings: batch ${currentBatch}/${totalBatches} (${Math.min(i + batch.length, texts.length)}/${texts.length} chunks)`,
          details: {
            documentId,
            processedChunks: Math.min(i + batch.length, texts.length),
            totalChunks: texts.length,
            currentBatch,
            totalBatches,
            embeddingModel: EMBEDDING_MODEL,
            embeddingDimensions: EMBEDDING_DIMENSIONS,
            requestId,
          },
        })

        // Rate limiting to avoid API limits
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (error) {
        // Enhanced error handling for embedding generation
        const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
          requestId,
          timestamp: new Date().toISOString(),
        })

        const logEntry = formatErrorForLogging(parsedError, {
          requestId,
          timestamp: new Date().toISOString(),
          operation: "embedding-generation",
          documentId,
          filename,
          batchNumber: currentBatch,
          totalBatches,
          batchSize: batch.length,
        })

        console.error("Embedding generation failed:", JSON.stringify(logEntry, null, 2))

        // Update error status
        await kv.set(`document:${documentId}:status`, "error", { ex: 3600 })
        onProgress({
          stage: "error",
          percent: 0,
          message: `Embedding generation failed: ${parsedError.message}`,
          details: {
            documentId,
            requestId,
          },
        })

        throw error
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
        requestId,
        // Technical term weighting for UE5.4 terminology
        technicalTerms: extractTechnicalTerms(chunk.text),
        // Version awareness
        engineVersion: extractEngineVersion(chunk.text) || "5.4.0",
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
        requestId,
      },
    })

    // Store vectors in Pinecone with batch processing and error handling
    const pinecone = createClient(requestId)
    const upsertBatchSize = 50 // Optimized for Edge Runtime limits
    const totalUpsertBatches = Math.ceil(vectors.length / upsertBatchSize)

    for (let i = 0; i < vectors.length; i += upsertBatchSize) {
      const batch = vectors.slice(i, i + upsertBatchSize)
      const currentUpsertBatch = Math.floor(i / upsertBatchSize) + 1

      try {
        // Upsert batch with retry logic
        await retry(() => pinecone.upsert(batch), {
          retries: 3,
          requestId,
          context: {
            operation: "vector-upsert",
            documentId,
            batchNumber: currentUpsertBatch,
            batchSize: batch.length,
          },
        })

        // Calculate and report progress (70% to 95% for storing stage)
        const storingProgress = 70 + Math.floor(((i + batch.length) / vectors.length) * 25)
        onProgress({
          stage: "storing",
          percent: storingProgress,
          message: `Storing vectors: batch ${currentUpsertBatch}/${totalUpsertBatches} (${Math.min(i + batch.length, vectors.length)}/${vectors.length} vectors)`,
          details: {
            documentId,
            storedVectors: Math.min(i + batch.length, vectors.length),
            totalVectors: vectors.length,
            currentBatch: currentUpsertBatch,
            totalBatches: totalUpsertBatches,
            requestId,
          },
        })

        // Rate limiting to avoid Pinecone limits
        if (i + upsertBatchSize < vectors.length) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (error) {
        // Enhanced error handling for vector storage
        const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
          requestId,
          timestamp: new Date().toISOString(),
        })

        const logEntry = formatErrorForLogging(parsedError, {
          requestId,
          timestamp: new Date().toISOString(),
          operation: "vector-upsert",
          documentId,
          filename,
          batchNumber: currentUpsertBatch,
          totalBatches: totalUpsertBatches,
          batchSize: batch.length,
        })

        console.error("Vector storage failed:", JSON.stringify(logEntry, null, 2))

        // Update error status
        await kv.set(`document:${documentId}:status`, "error", { ex: 3600 })
        onProgress({
          stage: "error",
          percent: 0,
          message: `Vector storage failed: ${parsedError.message}`,
          details: {
            documentId,
            requestId,
          },
        })

        throw error
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
        requestId,
      },
    })

    console.log(
      "Document processing completed:",
      JSON.stringify(
        {
          requestId,
          documentId,
          filename,
          chunkCount: chunks.length,
          vectorCount: vectors.length,
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    return { chunks, vectors }
  } catch (error) {
    // Enhanced error handling for overall processing
    const processingTime = Date.now() - startTime
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      timestamp: new Date().toISOString(),
    })

    const logEntry = formatErrorForLogging(parsedError, {
      requestId,
      timestamp: new Date().toISOString(),
      operation: "document-processing",
      documentId,
      filename,
      type,
      contentLength: content.length,
      processingTime: `${processingTime}ms`,
    })

    console.error("Document processing failed:", JSON.stringify(logEntry, null, 2))

    // Update error status
    await kv.set(`document:${documentId}:status`, "error", { ex: 3600 })
    onProgress({
      stage: "error",
      percent: 0,
      message: `Document processing failed: ${parsedError.message}`,
      details: {
        documentId,
        requestId,
      },
    })

    throw error
  }
}

// Helper function to extract technical terms for weighting
function extractTechnicalTerms(text: string): string[] {
  const technicalTerms: string[] = []

  // UE5.4 specific terms
  const ue5Terms = [
    "Blueprint",
    "UE5",
    "Unreal Engine",
    "Actor",
    "Component",
    "Pawn",
    "Character",
    "GameMode",
    "PlayerController",
    "HUD",
    "Widget",
    "UMG",
    "Material",
    "Shader",
    "Mesh",
    "Animation",
    "Montage",
    "Sequence",
    "Level",
    "World",
    "Landscape",
    "Lighting",
    "Lumen",
    "Nanite",
    "MetaHuman",
    "Chaos",
    "Physics",
    "Collision",
  ]

  // API and programming terms
  const apiTerms = [
    "function",
    "class",
    "method",
    "property",
    "parameter",
    "return",
    "void",
    "const",
    "static",
    "virtual",
    "override",
    "public",
    "private",
    "protected",
  ]

  const allTerms = [...ue5Terms, ...apiTerms]

  for (const term of allTerms) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      technicalTerms.push(term)
    }
  }

  return technicalTerms
}

// Helper function to extract engine version information
function extractEngineVersion(text: string): string | null {
  const versionMatch = text.match(/(?:UE|Unreal Engine)\s*(\d+\.\d+(?:\.\d+)?)/i)
  return versionMatch ? versionMatch[1] : null
}
