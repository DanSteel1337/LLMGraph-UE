/**
 * Document Processing API Route with Real-Time Progress Streaming
 *
 * Purpose: Processes uploaded documents into vector embeddings and streams progress updates
 *
 * Features:
 * - Fetches document content from Vercel Blob storage
 * - Chunks documents using semantic text splitting (200-500 tokens text, 750-1500 code)
 * - Generates embeddings using OpenAI text-embedding-3-large (3072 dimensions)
 * - Stores vectors in Pinecone with rich metadata
 * - Streams real-time progress updates via Server-Sent Events
 * - Updates processing status in Vercel KV with TTL
 * - Implements technical term weighting and version awareness
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime with streaming support for long operations
 *
 * Request Format:
 * POST /api/documents/process?id=documentId
 *
 * Response Format:
 * Content-Type: text/plain (Server-Sent Events)
 * Each line: JSON object with progress update
 *
 * Progress Update Structure:
 * {
 *   id: string,           // Document ID
 *   status: string,       // Processing status
 *   progress: number,     // Percentage (0-100)
 *   stage: string,        // Current processing stage
 *   message: string,      // Human-readable status message
 *   details?: object      // Additional processing details
 * }
 *
 * Processing Flow:
 * 1. Validate authentication and document existence
 * 2. Fetch document content from blob storage
 * 3. Chunk document into semantic segments (with progress updates)
 * 4. Generate embeddings in batches (with progress updates)
 * 5. Store vectors in Pinecone with metadata (with progress updates)
 * 6. Update final status in KV storage
 *
 * Error Handling:
 * - Streams error messages through the same channel
 * - Updates document status to "error" in KV
 * - Provides detailed error context for debugging
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { processDocumentWithProgress } from "@/lib/documents/processor"
import { getDocument } from "@/lib/documents/storage"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

// Helper to convert ReadableStream to string
async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value)
  }

  return result
}

export async function POST(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV", "OPENAI", "PINECONE"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID from query params
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Get document metadata
    const document = await getDocument(documentId)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Create a text encoder for the stream
    const encoder = new TextEncoder()

    // Create a streaming response using Server-Sent Events format
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress update
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                id: documentId,
                status: "processing",
                stage: "initializing",
                progress: 0,
                message: "Starting document processing...",
                timestamp: new Date().toISOString(),
              }) + "\n",
            ),
          )

          // Update status to processing with TTL
          await kv.set(
            `document:${documentId}`,
            {
              ...document,
              status: "processing",
              processingStartedAt: new Date().toISOString(),
            },
            { ex: 3600 }, // 1 hour TTL
          )

          // Send progress update for content fetching
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                id: documentId,
                status: "processing",
                stage: "fetching",
                progress: 5,
                message: "Fetching document content from storage...",
                timestamp: new Date().toISOString(),
              }) + "\n",
            ),
          )

          // Fetch document content
          const response = await fetch(document.url)
          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
          }
          const content = await streamToString(response.body!)

          // Send progress update for processing start
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                id: documentId,
                status: "processing",
                stage: "analyzing",
                progress: 10,
                message: "Document content fetched, analyzing structure...",
                details: {
                  contentLength: content.length,
                  documentType: document.type,
                  filename: document.name,
                },
                timestamp: new Date().toISOString(),
              }) + "\n",
            ),
          )

          // Process document with progress updates
          const { chunks, vectors } = await processDocumentWithProgress(
            documentId,
            content,
            document.name,
            document.type,
            (progress) => {
              // Send progress updates through the stream
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    id: documentId,
                    status: "processing",
                    stage: progress.stage,
                    progress: progress.percent,
                    message: progress.message,
                    details: progress.details,
                    timestamp: new Date().toISOString(),
                  }) + "\n",
                ),
              )
            },
          )

          // Update final status with processing details and TTL
          await kv.set(
            `document:${documentId}`,
            {
              ...document,
              status: "processed",
              processingCompletedAt: new Date().toISOString(),
              chunkCount: chunks.length,
              vectorCount: vectors.length,
            },
            { ex: 86400 }, // 24 hour TTL for processed documents
          )

          // Send final success message
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                id: documentId,
                status: "processed",
                stage: "completed",
                progress: 100,
                message: "Document processing completed successfully",
                details: {
                  chunkCount: chunks.length,
                  vectorCount: vectors.length,
                  processingTime: Date.now() - new Date(document.processingStartedAt || Date.now()).getTime(),
                },
                timestamp: new Date().toISOString(),
              }) + "\n",
            ),
          )

          // Close the stream
          controller.close()
        } catch (error) {
          console.error("Processing error:", error)

          // Update status to error with TTL
          const document = await getDocument(documentId)
          if (document) {
            await kv.set(
              `document:${documentId}`,
              {
                ...document,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                errorTimestamp: new Date().toISOString(),
              },
              { ex: 3600 }, // 1 hour TTL for error states
            )
          }

          // Send error message through the stream
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                id: documentId,
                status: "error",
                stage: "error",
                progress: 0,
                message: error instanceof Error ? error.message : "Unknown error occurred",
                error: {
                  type: error instanceof Error ? error.constructor.name : "UnknownError",
                  message: error instanceof Error ? error.message : "Unknown error",
                  stack: error instanceof Error ? error.stack : undefined,
                },
                timestamp: new Date().toISOString(),
              }) + "\n",
            ),
          )

          // Close the stream
          controller.close()
        }
      },
    })

    // Return the streaming response with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    })
  } catch (error) {
    console.error("Processing initialization error:", error)

    // Update status to error if document ID is available
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (documentId) {
      try {
        const document = await getDocument(documentId)
        if (document) {
          await kv.set(
            `document:${documentId}`,
            {
              ...document,
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
              errorTimestamp: new Date().toISOString(),
            },
            { ex: 3600 }, // 1 hour TTL
          )
        }
      } catch (kvError) {
        console.error("Failed to update document status:", kvError)
      }
    }

    return NextResponse.json(
      {
        error: "Failed to initialize document processing",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
