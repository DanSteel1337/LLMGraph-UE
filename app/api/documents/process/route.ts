/**
 * Document Processing API Route - Simplified and Robust
 */

import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { getDocument } from "../../../../lib/documents/storage"
import { debug, captureError } from "../../../lib/utils/debug"

export const runtime = "edge"

// Helper to create a streaming response
function createStream() {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  return {
    stream: stream.readable,
    write: async (message: any) => {
      await writer.write(encoder.encode(JSON.stringify(message) + "\n"))
    },
    close: () => writer.close(),
  }
}

export async function POST(request: NextRequest) {
  debug.group("Document Processing API")
  debug.log("Processing request started")

  try {
    validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])
    debug.log("Environment variables validated")
  } catch (error) {
    debug.error("Environment validation failed:", error)
    return NextResponse.json(
      { error: "Configuration Error", message: "Missing required environment variables" },
      { status: 500 },
    )
  }

  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()
    debug.log("Auth check result:", error ? "Failed" : "Success")

    if (error || !data.user) {
      debug.error("Authentication failed:", error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID from query params
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")
    debug.log("Document ID from query:", documentId)

    if (!documentId) {
      debug.error("Missing document ID")
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Get document metadata
    debug.log("Fetching document metadata for ID:", documentId)
    const document = await getDocument(documentId)
    debug.log("Document metadata result:", document ? "Found" : "Not found")

    if (!document) {
      debug.error("Document not found:", documentId)
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)
    debug.log("Document status:", status)

    if (status === "processing") {
      debug.error("Document already processing:", documentId)
      return NextResponse.json({ error: "Document is already being processed" }, { status: 400 })
    }

    // Set up streaming response
    debug.log("Setting up streaming response")
    const { stream, write, close } = createStream()

    // Process document in the background
    processDocumentSimple(documentId, document.url, document.type, write, close).catch((error) => {
      debug.error(`Error processing document ${documentId}:`, error)
      write({
        type: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      }).catch(console.error)
      close().catch(console.error)
    })

    // Return streaming response
    debug.log("Returning streaming response")
    debug.groupEnd()
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    const errorInfo = captureError(error, "Document processing API")
    debug.error("Document processing error:", errorInfo)
    debug.groupEnd()

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to process document",
        ...(process.env.NEXT_PUBLIC_DEBUG === "true" && { debug: errorInfo }),
      },
      { status: 500 },
    )
  }
}

async function processDocumentSimple(
  documentId: string,
  url: string,
  type: string,
  write: (message: any) => Promise<void>,
  close: () => Promise<void>,
) {
  debug.group(`Simple Processing: ${documentId}`)
  debug.log("Starting simple processing for document:", documentId)

  try {
    // Update document status
    await kv.set(`document:${documentId}:status`, "processing")
    debug.log("Document status set to processing")

    // Send initial progress update
    await write({
      type: "info",
      stage: "processing",
      percent: 0,
      message: "Starting document processing...",
    })

    // Step 1: Fetch document content
    await write({
      type: "info",
      stage: "processing",
      percent: 20,
      message: "Fetching document content...",
    })

    let content: string
    let contentLength = 0

    try {
      debug.log("Fetching content from URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/plain, text/*, */*",
          "User-Agent": "LLMGraph-UE/1.0",
        },
      })

      debug.log("Response status:", response.status)
      debug.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (type === "application/pdf") {
        content = "PDF processing not yet implemented"
        contentLength = content.length
      } else {
        const responseText = await response.text()
        content = responseText || ""
        contentLength = content.length
      }

      debug.log("Content fetched successfully, length:", contentLength)

      if (contentLength === 0) {
        throw new Error("Document appears to be empty")
      }
    } catch (fetchError) {
      debug.error("Fetch error:", fetchError)
      throw new Error(`Failed to fetch document: ${fetchError.message}`)
    }

    // Step 2: Basic content processing
    await write({
      type: "info",
      stage: "processing",
      percent: 50,
      message: "Processing document content...",
    })

    // Simple chunking - split by paragraphs or lines
    const chunks = content
      .split(/\n\s*\n/)
      .filter((chunk) => chunk.trim().length > 0)
      .map((chunk, index) => ({
        id: `${documentId}-chunk-${index}`,
        content: chunk.trim(),
        index,
      }))

    debug.log("Created chunks:", chunks.length)

    // Step 3: Store processing results
    await write({
      type: "info",
      stage: "processing",
      percent: 80,
      message: "Storing processing results...",
    })

    // Store document processing results
    await kv.set(`document:${documentId}:chunks`, chunks.length)
    await kv.set(`document:${documentId}:content-length`, contentLength)
    await kv.set(`document:${documentId}:processed-at`, new Date().toISOString())
    await kv.set(`document:${documentId}:status`, "processed")

    debug.log("Processing results stored")

    // Step 4: Complete
    await write({
      type: "info",
      stage: "completed",
      percent: 100,
      message: `Document processed successfully! Created ${chunks.length} chunks.`,
    })

    await write({
      type: "done",
      message: "Document processing completed successfully",
    })

    debug.log("Processing completed successfully")
  } catch (error) {
    debug.error("Processing error:", error)

    // Update status to error
    await kv.set(`document:${documentId}:status`, "error")
    await kv.set(`document:${documentId}:error`, error instanceof Error ? error.message : "Unknown error")

    await write({
      type: "error",
      message: error instanceof Error ? error.message : "Processing failed",
    })

    throw error
  } finally {
    await close()
    debug.log("Stream closed")
    debug.groupEnd()
  }
}
