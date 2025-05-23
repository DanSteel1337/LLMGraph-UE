/**
 * Document Processing API Route
 *
 * Purpose: Processes uploaded documents into vector embeddings with streaming progress
 *
 * Features:
 * - Fetches document content from Blob storage
 * - Chunks document into semantic segments
 * - Generates embeddings using OpenAI text-embedding-3-large
 * - Stores vectors in Pinecone with rich metadata
 * - Streams real-time progress updates to the client
 * - Handles errors with detailed error messages
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 */

import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { processDocumentWithProgress } from "../../../../lib/documents/processor"
import { getDocument } from "../../../../lib/documents/storage"

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
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "OPENAI", "PINECONE", "VERCEL_BLOB", "VERCEL_KV"])

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

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)
    if (status === "processing") {
      return NextResponse.json({ error: "Document is already being processed" }, { status: 400 })
    }

    // Set up streaming response
    const { stream, write, close } = createStream()

    // Process document in the background
    processInBackground(documentId, document.url, document.type, write, close).catch((error) => {
      console.error(`Error processing document ${documentId}:`, error)
      write({
        type: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      }).catch(console.error)
      close().catch(console.error)
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Document processing error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to process document",
      },
      { status: 500 },
    )
  }
}

async function processInBackground(
  documentId: string,
  url: string,
  type: string,
  write: (message: any) => Promise<void>,
  close: () => Promise<void>,
) {
  try {
    // Update document status
    await kv.set(`document:${documentId}:status`, "processing")

    // Send initial progress update
    await write({
      type: "info",
      stage: "processing",
      percent: 0,
      message: "Starting document processing...",
    })

    // Fetch document content from Blob
    await write({
      type: "info",
      stage: "processing",
      percent: 5,
      message: "Fetching document content...",
    })

    const blob = await get(url)
    if (!blob) {
      throw new Error("Failed to fetch document content")
    }

    let content: string
    if (type === "application/pdf") {
      // For PDF, we would use a PDF parser here
      // This is a placeholder - in a real implementation, you would use a PDF parsing library
      content = "PDF content would be extracted here"
    } else {
      // For text-based documents, just get the text
      content = await blob.text()
    }

    // Process document with progress streaming
    await processDocumentWithProgress(
      documentId,
      content,
      blob.pathname.split("/").pop() || "document",
      type,
      async (progress) => {
        await write({
          type: "info",
          ...progress,
        })
      },
    )

    // Send completion message
    await write({
      type: "done",
      message: "Document processing completed successfully",
    })

    // Close the stream
    await close()
  } catch (error) {
    // Update document status to error
    await kv.set(`document:${documentId}:status`, "error")
    await kv.set(`document:${documentId}:error`, error instanceof Error ? error.message : "Unknown error")

    // Send error message
    await write({
      type: "error",
      message: error instanceof Error ? error.message : "An unknown error occurred during processing",
    })

    // Close the stream
    await close()

    // Re-throw for logging
    throw error
  }
}
