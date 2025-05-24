/**
 * Document Processing API Route - Edge Runtime Compatible
 *
 * IMPORTANT: Edge Runtime Fetch Requirements
 * - Always validate Vercel Blob URLs exist using head() before fetch()
 * - The head() method ensures the blob exists and returns valid metadata
 * - This prevents "Cannot read properties of undefined" errors
 * - Edge Runtime requires proper URL validation before fetch operations
 *
 * @see https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
 */

import { type NextRequest, NextResponse } from "next/server"
import { head } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { getDocument } from "../../../../lib/documents/storage"
import { fetchBlobContent } from "../../../../lib/utils/blob-fetch"

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
  console.log("[DEBUG] Document Processing API - Request started")

  try {
    validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])
    console.log("[DEBUG] Environment variables validated")
  } catch (error) {
    console.error("[DEBUG] Environment validation failed:", error)
    return NextResponse.json(
      { error: "Configuration Error", message: "Missing required environment variables" },
      { status: 500 },
    )
  }

  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()
    console.log("[DEBUG] Auth check result:", error ? "Failed" : "Success")

    if (error || !data.user) {
      console.error("[DEBUG] Authentication failed:", error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID from query params
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")
    console.log("[DEBUG] Document ID from query:", documentId)

    if (!documentId) {
      console.error("[DEBUG] Missing document ID")
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Get document metadata
    console.log("[DEBUG] Fetching document metadata for ID:", documentId)
    const document = await getDocument(documentId)
    console.log("[DEBUG] Document metadata result:", document ? "Found" : "Not found")

    if (!document) {
      console.error("[DEBUG] Document not found:", documentId)
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)
    console.log("[DEBUG] Document status:", status)

    if (status === "processing") {
      console.error("[DEBUG] Document already processing:", documentId)
      return NextResponse.json({ error: "Document is already being processed" }, { status: 400 })
    }

    // Set up streaming response
    console.log("[DEBUG] Setting up streaming response")
    const { stream, write, close } = createStream()

    // Process document in the background
    processDocumentWithValidation(documentId, document.url, document.type, write, close).catch((error) => {
      console.error(`[DEBUG] Error processing document ${documentId}:`, error)
      write({
        type: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      }).catch(console.error)
      close().catch(console.error)
    })

    // Return streaming response
    console.log("[DEBUG] Returning streaming response")
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[DEBUG] Document processing error:", error)

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to process document",
        ...(process.env.NEXT_PUBLIC_DEBUG === "true" && {
          debug: {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
        }),
      },
      { status: 500 },
    )
  }
}

async function processDocumentWithValidation(
  documentId: string,
  url: string,
  type: string,
  write: (message: any) => Promise<void>,
  close: () => Promise<void>,
) {
  console.log(`[DEBUG] Starting validated processing for document: ${documentId}`)
  console.log(`[DEBUG] Document URL: ${url}`)
  console.log(`[DEBUG] Document type: ${type}`)

  try {
    // Update document status
    await kv.set(`document:${documentId}:status`, "processing")
    console.log("[DEBUG] Document status set to processing")

    // Send initial progress update
    await write({
      type: "info",
      stage: "processing",
      percent: 0,
      message: "Starting document processing...",
    })

    // Step 1: Validate blob exists using head() method
    await write({
      type: "info",
      stage: "processing",
      percent: 10,
      message: "Validating document accessibility...",
    })

    console.log("[DEBUG] Validating blob exists using head() method")

    try {
      // Use head() to validate blob exists and get metadata
      const blobMetadata = await head(url, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      console.log("[DEBUG] Blob validation successful:", {
        size: blobMetadata.size,
        contentType: blobMetadata.contentType,
        uploadedAt: blobMetadata.uploadedAt,
      })

      await write({
        type: "info",
        stage: "processing",
        percent: 20,
        message: `Document validated (${(blobMetadata.size / 1024).toFixed(1)} KB)`,
      })
    } catch (headError) {
      console.error("[DEBUG] Blob validation failed:", headError)

      if (headError.name === "BlobNotFoundError") {
        throw new Error("Document not found in storage. It may have been deleted.")
      }

      throw new Error(`Failed to validate document: ${headError.message}`)
    }

    // Step 2: Fetch document content using the utility function
    await write({
      type: "info",
      stage: "processing",
      percent: 30,
      message: "Fetching document content...",
    })

    let content: string
    let contentLength = 0

    try {
      console.log("[DEBUG] Fetching content using validated blob fetch")

      if (type === "application/pdf") {
        content = "PDF processing not yet implemented"
        contentLength = content.length
        console.log("[DEBUG] PDF processing placeholder used")
      } else {
        // Use the utility function for safe blob fetching
        content = await fetchBlobContent(url)
        contentLength = content.length
        console.log("[DEBUG] Content fetched successfully, length:", contentLength)
      }

      if (contentLength === 0) {
        throw new Error("Document appears to be empty")
      }

      await write({
        type: "info",
        stage: "processing",
        percent: 50,
        message: `Content loaded (${contentLength} characters)`,
      })
    } catch (fetchError) {
      console.error("[DEBUG] Content fetch error:", fetchError)
      throw new Error(`Failed to fetch document content: ${fetchError.message}`)
    }

    // Step 3: Basic content processing
    await write({
      type: "info",
      stage: "chunking",
      percent: 60,
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

    console.log("[DEBUG] Created chunks:", chunks.length)

    await write({
      type: "info",
      stage: "chunking",
      percent: 70,
      message: `Document chunked into ${chunks.length} segments`,
    })

    // Step 4: Store processing results
    await write({
      type: "info",
      stage: "storing",
      percent: 80,
      message: "Storing processing results...",
    })

    // Store document processing results
    await kv.set(`document:${documentId}:chunks`, chunks.length)
    await kv.set(`document:${documentId}:content-length`, contentLength)
    await kv.set(`document:${documentId}:processed-at`, new Date().toISOString())
    await kv.set(`document:${documentId}:status`, "completed")

    console.log("[DEBUG] Processing results stored")

    // Step 5: Complete
    await write({
      type: "info",
      stage: "completed",
      percent: 100,
      message: `Document processed successfully! Created ${chunks.length} chunks from ${contentLength} characters.`,
    })

    await write({
      type: "done",
      message: "Document processing completed successfully",
    })

    console.log("[DEBUG] Processing completed successfully")
  } catch (error) {
    console.error("[DEBUG] Processing error:", error)

    // Update status to error
    await kv.set(`document:${documentId}:status`, "error")
    await kv.set(`document:${documentId}:error`, error instanceof Error ? error.message : "Unknown error")

    await write({
      type: "error",
      stage: "error",
      message: error instanceof Error ? error.message : "Processing failed",
    })

    throw error
  } finally {
    await close()
    console.log("[DEBUG] Stream closed")
  }
}
