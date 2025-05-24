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
import { kv } from "@vercel/kv"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 })
    }

    const url = new URL(request.url)
    const documentId = url.searchParams.get("id")

    if (documentId) {
      const document = await getDocument(documentId)
      if (!document) {
        return NextResponse.json({ error: "Not Found", message: "Document not found" }, { status: 404 })
      }
      return NextResponse.json(document)
    } else {
      // Get documents with enhanced validation
      const documents = await getDocuments()

      // Enhanced document processing with status lookup
      const formattedDocuments = await Promise.all(
        documents
          .filter((doc) => doc.id && doc.id !== "undefined") // Filter out invalid documents
          .map(async (doc) => {
            try {
              // Get current status from KV
              const status = await kv.get(`document:${doc.id}:status`)
              const chunks = await kv.get(`document:${doc.id}:chunks`)
              const vectors = await kv.get(`document:${doc.id}:vectors`)
              const error = await kv.get(`document:${doc.id}:error`)

              return {
                id: doc.id,
                name: doc.name || doc.filename || "Unnamed Document",
                type: doc.type || doc.fileType || "unknown",
                size: doc.size || doc.fileSize || 0,
                url: doc.url || "",
                uploadedAt: doc.uploadedAt || new Date().toISOString(),
                status: typeof status === "object" ? status.status || "unknown" : status || "unknown",
                chunkCount: chunks || 0,
                vectorCount: vectors || 0,
                error: error || undefined,
              }
            } catch (statusError) {
              console.error(`[DOCUMENTS API] Error getting status for document ${doc.id}:`, statusError)
              return {
                id: doc.id,
                name: doc.name || "Unnamed Document",
                type: doc.type || "unknown",
                size: doc.size || 0,
                url: doc.url || "",
                uploadedAt: doc.uploadedAt || new Date().toISOString(),
                status: "error",
                chunkCount: 0,
                vectorCount: 0,
                error: "Failed to retrieve document status",
              }
            }
          }),
      )

      // Filter out any documents that still have invalid data
      const validDocuments = formattedDocuments.filter(
        (doc) => doc.id && doc.id !== "undefined" && doc.name && doc.name !== "Unnamed Document",
      )

      console.log("[DOCUMENTS API] Returning valid documents:", validDocuments.length)
      return NextResponse.json(validDocuments)
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
