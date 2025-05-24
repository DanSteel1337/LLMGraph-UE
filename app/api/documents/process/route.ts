import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { requireAuth } from "../../../../lib/auth"
import { processDocument } from "../../../../lib/documents/processor"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // Validate environment
    const envResult = validateEnv(["openai", "pinecone", "blob"])
    if (!envResult.isValid) {
      return NextResponse.json({ error: "Environment configuration error" }, { status: 500 })
    }

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    // Get document ID, URL, and filename from request body
    const { documentId, url, filename } = await request.json()

    if (!documentId || !url || !filename) {
      return NextResponse.json({ error: "Document ID, URL, and filename are required" }, { status: 400 })
    }

    // Check if document is already being processed
    const status = await kv.get(`document:${documentId}:status`)

    if (status === "processing") {
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }
    
    console.error("Document processing error:", error)
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 })
  }
}
