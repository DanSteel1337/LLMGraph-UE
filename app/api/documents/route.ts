import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { getDocuments, getDocument, deleteDocument } from "@/lib/documents/storage"
import { createEdgeClient } from "@/lib/supabase"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document ID from query params if present
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (documentId) {
      // Get specific document
      const document = await getDocument(documentId)

      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      return NextResponse.json(document)
    } else {
      // List all documents
      const documents = await getDocuments()
      return NextResponse.json(documents)
    }
  } catch (error) {
    console.error("Document API error:", error)
    return NextResponse.json({ error: "Failed to process document request" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV", "VERCEL_BLOB", "PINECONE"])

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

    // Delete document
    await deleteDocument(documentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document deletion error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
