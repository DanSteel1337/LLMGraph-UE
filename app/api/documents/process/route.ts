import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { createClient } from "@/lib/pinecone/client"
import { processDocument } from "@/lib/documents/processor"
import { getDocument } from "@/lib/documents/storage"
import { createEdgeClient } from "@/lib/supabase"

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

    // Update status to processing
    await kv.set(`document:${documentId}`, {
      ...document,
      status: "processing",
      processingStartedAt: new Date().toISOString(),
    })

    // Fetch document content
    const response = await fetch(document.url)
    const content = await streamToString(response.body!)

    // Initialize Pinecone client
    const pineconeClient = createClient()

    // Process document (chunk, embed, store)
    const { chunks, vectors } = await processDocument(documentId, content, document.name, document.type)

    // Update status with processing details
    await kv.set(`document:${documentId}`, {
      ...document,
      status: "processed",
      processingCompletedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      vectorCount: vectors.length,
    })

    return NextResponse.json({
      id: documentId,
      status: "processed",
      chunkCount: chunks.length,
      vectorCount: vectors.length,
    })
  } catch (error) {
    console.error("Processing error:", error)

    // Update status to error if document ID is available
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (documentId) {
      const document = await getDocument(documentId)
      if (document) {
        await kv.set(`document:${documentId}`, {
          ...document,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({ error: "Failed to process document" }, { status: 500 })
  }
}
