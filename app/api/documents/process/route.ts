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
import { processDocument } from "../../../../lib/documents/processor"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  console.log("[PROCESS API] Document Processing API - Request started")

  try {
    // Validate environment
    const envResult = validateEnv(["openai", "pinecone", "blob"])
    if (!envResult.isValid) {
      return NextResponse.json({ error: "Environment configuration error" }, { status: 500 })
    }

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    console.log("[PROCESS API] Auth check result:", authError ? "Failed" : "Success")

    if (authError || !user) {
      console.error("[PROCESS API] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID, URL, and filename from request body
    const { documentId, url, filename } = await request.json()

    console.log("[PROCESS API] Document ID from request body:", documentId)
    console.log("[PROCESS API] Document URL from request body:", url)
    console.log("[PROCESS API] Document filename from request body:", filename)

    if (!documentId || !url || !filename) {
      console.error("[PROCESS API] Missing required fields")
      return NextResponse.json({ error: "Document ID, URL, and filename are required" }, { status: 400 })
    }

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)
    console.log("[PROCESS API] Document status:", status)

    if (status === "processing") {
      console.error("[PROCESS API] Document already processing:", documentId)
      return NextResponse.json({ error: "Document is already being processed" }, { status: 400 })
    }

    // Process document with streaming updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await processDocument(documentId, url, filename, (update) => {
            const data = `data: ${JSON.stringify(update)}\n\n`
            controller.enqueue(encoder.encode(data))
          })

          controller.close()
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Processing failed",
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

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
