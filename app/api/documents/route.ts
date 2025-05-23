/**
 * Document Management API Route
 *
 * Purpose: Handles CRUD operations for document metadata and storage
 *
 * Features:
 * - GET: Retrieves document list or specific document by ID
 * - DELETE: Removes document from storage and associated vectors from Pinecone
 * - Manages document metadata in Vercel KV
 * - Integrates with Vercel Blob for file storage
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 *
 * GET Request Formats:
 * - GET /api/documents - Returns all documents
 * - GET /api/documents?id=documentId - Returns specific document
 *
 * DELETE Request Format:
 * - DELETE /api/documents?id=documentId - Deletes document and vectors
 *
 * Response Formats:
 * GET (all): Document[]
 * GET (single): Document | 404
 * DELETE: { success: true } | Error
 *
 * Document Structure:
 * {
 *   id: string,
 *   name: string,
 *   type: string,
 *   size: number,
 *   url: string,
 *   uploadedAt: string,
 *   status: "uploaded" | "processing" | "processed" | "error",
 *   chunkCount?: number,
 *   vectorCount?: number,
 *   error?: string
 * }
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { getDocuments, getDocument, deleteDocument } from "../../../lib/documents/storage"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 })
    }

    // Get document ID from query params if present
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (documentId) {
      // Get specific document
      const document = await getDocument(documentId)

      if (!document) {
        return NextResponse.json({ error: "Not Found", message: "Document not found" }, { status: 404 })
      }

      return NextResponse.json(document)
    } else {
      // List all documents
      const documents = await getDocuments()
      return NextResponse.json(documents)
    }
  } catch (error) {
    console.error("Document API error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to process document request",
      },
      { status: 500 },
    )
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
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 })
    }

    // Get document ID from query params
    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (!documentId) {
      return NextResponse.json({ error: "Bad Request", message: "Document ID is required" }, { status: 400 })
    }

    // Delete document
    await deleteDocument(documentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document deletion error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 },
    )
  }
}
