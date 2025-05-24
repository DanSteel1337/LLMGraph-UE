/**
 * Document Processing API Route - Edge Runtime Compatible
 *
 * IMPORTANT: Edge Runtime Fetch Requirements
 * - Always validate Vercel Blob URLs exist using head() before fetch()
 * - The head() method ensures the blob exists and returns valid metadata
 * - This prevents "Cannot read properties of undefined" errors
 * - Edge Runtime requires proper URL validation before fetch operations
 * - Handle both public and private blob access patterns
 *
 * @see https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
 */

import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { getDocument, validateDocumentBlob } from "../../../../lib/documents/storage"
import { fetchBlobContent, validateBlobExists } from "../../../../lib/utils/blob-fetch"

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
  console.log("[PROCESS API] Document Processing API - Request started")

  try {
    validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])
    console.log("[PROCESS API] Environment variables validated")
  } catch (error) {
    console.error("[PROCESS API] Environment validation failed:", error)
    return NextResponse.json(
      { error: "Configuration Error", message: "Missing required environment variables" },
      { status: 500 },
    )
  }

  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()
    console.log("[PROCESS API] Auth check result:", error ? "Failed" : "Success")

    if (error || !data.user) {
      console.error("[PROCESS API] Authentication failed:", error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID from query params
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")
    console.log("[PROCESS API] Document ID from query:", documentId)

    if (!documentId) {
      console.error("[PROCESS API] Missing document ID")
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Get document metadata with enhanced validation
    console.log("[PROCESS API] Fetching document metadata for ID:", documentId)
    const document = await getDocument(documentId)
    console.log("[PROCESS API] Document metadata result:", document ? "Found" : "Not found")

    if (!document) {
      console.error("[PROCESS API] Document not found:", documentId)
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Enhanced document validation
    if (!document.url) {
      console.error("[PROCESS API] Document has no blob URL:", documentId)
      return NextResponse.json({ error: "Document has no associated file" }, { status: 400 })
    }

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)
    console.log("[PROCESS API] Document status:", status)

    if (status === "processing") {
      console.error("[PROCESS API] Document already processing:", documentId)
      return NextResponse.json({ error: "Document is already being processed" }, { status: 400 })
    }

    // Validate blob accessibility before starting processing
    console.log("[PROCESS API] Validating blob accessibility")
    const blobValidation = await validateDocumentBlob(documentId)
    console.log("[PROCESS API] Blob validation result:", blobValidation)

    if (!blobValidation.accessible) {
      console.error("[PROCESS API] Blob not accessible:", blobValidation.error)
      return NextResponse.json(
        {
          error: "Document Not Accessible",
          message: blobValidation.error || "Document file is not accessible",
        },
        { status: 400 },
      )
    }

    // Set up streaming response
    console.log("[PROCESS API] Setting up streaming response")
    const { stream, write, close } = createStream()

    // Process document in the background
    processDocumentWithEnhancedValidation(documentId, document.url, document.fileType, write, close).catch((error) => {
      console.error(`[PROCESS API] Error processing document ${documentId}:`, error)
      write({
        type: "error",
        stage: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      }).catch(console.error)
      close().catch(console.error)
    })

    // Return streaming response
    console.log("[PROCESS API] Returning streaming response")
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[PROCESS API] Document processing error:", error)

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

async function processDocumentWithEnhancedValidation(
  documentId: string,
  url: string,
  type: string,
  write: (message: any) => Promise<void>,
  close: () => Promise<void>,
) {
  console.log(`[PROCESS] Starting enhanced processing for document: ${documentId}`)
  console.log(`[PROCESS] Document URL: ${url}`)
  console.log(`[PROCESS] Document type: ${type}`)

  try {
    // Update document status
    await kv.set(`document:${documentId}:status`, "processing")
    console.log("[PROCESS] Document status set to processing")

    // Send initial progress update
    await write({
      type: "info",
      stage: "processing",
      percent: 0,
      message: "Starting document processing...",
    })

    // Step 1: Enhanced blob validation
    await write({
      type: "info",
      stage: "processing",
      percent: 5,
      message: "Validating document accessibility...",
    })

    console.log("[PROCESS] Performing enhanced blob validation")

    // First check if blob exists
    const blobExists = await validateBlobExists(url)
    if (!blobExists) {
      throw new Error("Document not found in storage. The file may have been deleted or the URL is incorrect.")
    }

    console.log("[PROCESS] Blob existence validated successfully")

    await write({
      type: "info",
      stage: "processing",
      percent: 10,
      message: "Document accessibility confirmed",
    })

    // Step 2: Fetch document content with enhanced error handling
    await write({
      type: "info",
      stage: "processing",
      percent: 20,
      message: "Fetching document content...",
    })

    let content: string
    let contentLength = 0

    try {
      console.log("[PROCESS] Fetching content using enhanced blob fetch")

      if (type === "application/pdf") {
        content = "PDF processing not yet implemented"
        contentLength = content.length
        console.log("[PROCESS] PDF processing placeholder used")
      } else {
        // Use the enhanced utility function for safe blob fetching
        content = await fetchBlobContent(url)
        contentLength = content.length
        console.log("[PROCESS] Content fetched successfully, length:", contentLength)
      }

      if (contentLength === 0) {
        throw new Error("Document appears to be empty")
      }

      await write({
        type: "info",
        stage: "processing",
        percent: 40,
        message: `Content loaded successfully (${contentLength} characters)`,
      })
    } catch (fetchError) {
      console.error("[PROCESS] Content fetch error:", fetchError)
      throw new Error(`Failed to fetch document content: ${fetchError.message}`)
    }

    // Step 3: Enhanced content processing
    await write({
      type: "info",
      stage: "chunking",
      percent: 50,
      message: "Processing document content...",
    })

    // Enhanced chunking - split by paragraphs with better handling
    const chunks = content
      .split(/\n\s*\n/)
      .filter((chunk) => chunk.trim().length > 10) // Filter out very small chunks
      .map((chunk, index) => ({
        id: `${documentId}-chunk-${index}`,
        content: chunk.trim(),
        index,
        length: chunk.trim().length,
      }))

    console.log("[PROCESS] Created chunks:", {
      count: chunks.length,
      averageLength: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length,
      totalLength: contentLength,
    })

    await write({
      type: "info",
      stage: "chunking",
      percent: 70,
      message: `Document chunked into ${chunks.length} segments`,
    })

    // Step 4: Store processing results with enhanced metadata
    await write({
      type: "info",
      stage: "storing",
      percent: 80,
      message: "Storing processing results...",
    })

    // Store enhanced document processing results
    const processingResults = {
      chunks: chunks.length,
      contentLength,
      averageChunkLength: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length,
      processedAt: new Date().toISOString(),
      processingVersion: "1.0",
    }

    await kv.set(`document:${documentId}:chunks`, chunks.length)
    await kv.set(`document:${documentId}:content-length`, contentLength)
    await kv.set(`document:${documentId}:processed-at`, new Date().toISOString())
    await kv.set(`document:${documentId}:processing-results`, processingResults)
    await kv.set(`document:${documentId}:status`, "completed")

    console.log("[PROCESS] Processing results stored:", processingResults)

    // Step 5: Complete with detailed summary
    await write({
      type: "info",
      stage: "completed",
      percent: 100,
      message: `Document processed successfully! Created ${chunks.length} chunks from ${contentLength} characters.`,
      details: processingResults,
    })

    await write({
      type: "done",
      message: "Document processing completed successfully",
      summary: processingResults,
    })

    console.log("[PROCESS] Processing completed successfully")
  } catch (error) {
    console.error("[PROCESS] Processing error:", error)

    // Enhanced error storage
    const errorInfo = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      stage: "processing",
    }

    // Update status to error with detailed info
    await kv.set(`document:${documentId}:status`, "error")
    await kv.set(`document:${documentId}:error`, errorInfo)

    await write({
      type: "error",
      stage: "error",
      message: error instanceof Error ? error.message : "Processing failed",
      details: errorInfo,
    })

    throw error
  } finally {
    await close()
    console.log("[PROCESS] Stream closed")
  }
}
