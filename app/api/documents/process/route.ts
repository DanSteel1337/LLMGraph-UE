/**
 * Document Processing API Route with SSE Support
 * 
 * Purpose: Handles document processing with real-time progress updates
 * 
 * Features:
 * - GET: Server-Sent Events endpoint for progress streaming
 * - POST: Legacy endpoint (redirects to GET for SSE)
 * - Heartbeat mechanism to keep connections alive
 * - Proper cleanup on client disconnect
 * - Automatic abort handling
 * 
 * SSE Event Format:
 * - Progress updates: {id, status, progress, stage, message, details}
 * - Heartbeat: {type: "heartbeat", timestamp}
 * - Error: {id, status: "error", message, error}
 * - Complete: {id, status: "processed", progress: 100}
 * 
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime with streaming support
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { processDocumentWithProgress } from "@/lib/documents/processor"
import { getDocument } from "@/lib/documents/storage"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

// SSE helper functions
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function createHeartbeat(): string {
  return createSSEMessage({ type: "heartbeat", timestamp: new Date().toISOString() })
}

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

// GET handler for SSE
export async function GET(request: NextRequest) {
  // Validate environment variables
  validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV", "OPENAI", "PINECONE"])

  // Setup abort controller for cleanup
  const abortController = new AbortController()
  let heartbeatInterval: NodeJS.Timeout | null = null

  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID
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

    // Create a transform stream for SSE
    const { readable, writable } = new TransformStream({
      start(controller) {
        // Setup heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(createHeartbeat()))
          } catch (error) {
            // Connection might be closed
            console.error("Heartbeat error:", error)
          }
        }, 30000) // Every 30 seconds

        // Cleanup on abort
        abortController.signal.addEventListener("abort", () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
          try {
            controller.close()
          } catch (error) {
            // Controller might already be closed
          }
        })
      },
      transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      flush(controller) {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        controller.close()
      }
    })

    // Start processing in the background
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Process document asynchronously
    (async () => {
      try {
        // Send initial status
        await writer.write(encoder.encode(createSSEMessage({
          id: documentId,
          status: "processing",
          stage: "initializing",
          progress: 0,
          message: "Starting document processing...",
          timestamp: new Date().toISOString(),
        })))

        // Update status in KV
        await kv.set(
          `document:${documentId}`,
          {
            ...document,
            status: "processing",
            processingStartedAt: new Date().toISOString(),
          },
          { ex: 3600 } // 1 hour TTL
        )

        // Fetch document content
        await writer.write(encoder.encode(createSSEMessage({
          id: documentId,
          status: "processing",
          stage: "fetching",
          progress: 5,
          message: "Fetching document content from storage...",
          timestamp: new Date().toISOString(),
        })))

        const response = await fetch(document.url, { signal: abortController.signal })
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
        }

        const content = await streamToString(response.body!)

        // Process document with progress callback
        const { chunks, vectors } = await processDocumentWithProgress(
          documentId,
          content,
          document.name,
          document.type,
          async (progress) => {
            // Check if connection is still alive
            if (abortController.signal.aborted) {
              throw new Error("Processing aborted by client")
            }

            // Send progress update
            await writer.write(encoder.encode(createSSEMessage({
              id: documentId,
              status: "processing",
              stage: progress.stage,
              progress: progress.percent,
              message: progress.message,
              details: progress.details,
              timestamp: new Date().toISOString(),
            })))
          }
        )

        // Update final status
        await kv.set(
          `document:${documentId}`,
          {
            ...document,
            status: "processed",
            processingCompletedAt: new Date().toISOString(),
            chunkCount: chunks.length,
            vectorCount: vectors.length,
          },
          { ex: 86400 } // 24 hour TTL
        )

        // Send completion message
        await writer.write(encoder.encode(createSSEMessage({
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
        })))

      } catch (error) {
        console.error("Processing error:", error)

        // Update error status
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
            { ex: 3600 } // 1 hour TTL
          )
        }

        // Send error message
        await writer.write(encoder.encode(createSSEMessage({
          id: documentId,
          status: "error",
          stage: "error",
          progress: 0,
          message: error instanceof Error ? error.message : "Unknown error occurred",
          error: {
            type: error instanceof Error ? error.constructor.name : "UnknownError",
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error && process.env.NODE_ENV === "development" ? error.stack : undefined,
          },
          timestamp: new Date().toISOString(),
        })))
      } finally {
        // Clean up
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
        await writer.close()
      }
    })().catch(console.error)

    // Return SSE response with proper headers
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Transfer-Encoding": "chunked",
      },
    })

  } catch (error) {
    // Cleanup on error
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    abortController.abort()

    console.error("Processing initialization error:", error)

    // Update error status if possible
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
            { ex: 3600 } // 1 hour TTL
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
      { status: 500 }
    )
  }
}

// POST handler (for backward compatibility)
export async function POST(request: NextRequest) {
  // Redirect to GET for SSE
  const url = new URL(request.url)
  return NextResponse.redirect(url.toString(), { status: 307 })
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
