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

      // Map documents to ensure consistent format
      const formattedDocuments = documents.map((doc) => ({
        id: doc.id,
        name: doc.name || doc.filename || "Unnamed Document",
        type: doc.type || doc.fileType || "unknown",
        size: doc.size || doc.fileSize || 0,
        url: doc.url || "",
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        status: doc.status || "unknown",
        chunkCount: doc.chunkCount || 0,
        vectorCount: doc.vectorCount || 0,
        error: doc.error || undefined,
      }))

      return NextResponse.json(formattedDocuments)
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
