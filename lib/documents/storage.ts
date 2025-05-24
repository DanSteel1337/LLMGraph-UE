/**
 * Purpose: Document storage utilities
 * Logic:
 * - Manages document storage and retrieval
 * - Handles document metadata with enhanced blob validation
 * Runtime context: Edge Function
 * Services: Vercel Blob (for document storage), Vercel KV (for metadata)
 */
import { del } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"
import { testBlobAccess } from "../utils/blob-fetch"

// Enhanced document listing with pagination support and validation
export async function getDocuments(limit = 100, cursor?: string) {
  console.log("[STORAGE] Getting documents, limit:", limit)

  // Use scan pattern for efficient listing
  const pattern = "document:*"
  const documents = []

  try {
    // Get keys matching pattern
    const keys = await kv.keys(pattern)
    console.log("[STORAGE] Found document keys:", keys.length)

    // Filter out status and metric keys
    const documentKeys = keys.filter(
      (key) => !key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors"),
    )

    console.log("[STORAGE] Filtered document keys:", documentKeys.length)

    // Batch get for efficiency
    if (documentKeys.length > 0) {
      // Get documents in batches to avoid memory issues
      const batchSize = 20
      for (let i = 0; i < Math.min(documentKeys.length, limit); i += batchSize) {
        const batch = documentKeys.slice(i, i + batchSize)
        const batchPromises = batch.map((key) => kv.get(key))
        const batchResults = await Promise.all(batchPromises)

        for (const doc of batchResults) {
          if (doc) {
            // Normalize document format for consistency
            const normalizedDoc = {
              id: doc.id,
              name: doc.name || doc.filename || "Unnamed Document",
              filename: doc.filename || doc.name || "Unnamed Document",
              type: doc.type || doc.fileType || "unknown",
              fileType: doc.fileType || doc.type || "unknown",
              size: doc.size || doc.fileSize || 0,
              fileSize: doc.fileSize || doc.size || 0,
              url: doc.url || "",
              uploadedAt: doc.uploadedAt || new Date().toISOString(),
              status: doc.status || "unknown",
              userId: doc.userId,
              // Include blob metadata if available
              blobMetadata: doc.blobMetadata,
            }

            documents.push(normalizedDoc)
          }
        }
      }
    }

    console.log("[STORAGE] Retrieved documents:", documents.length)
  } catch (error) {
    console.error("[STORAGE] Error fetching documents:", error)
    // Return empty array on error rather than throwing
    return []
  }

  return documents
}

// Get document metadata and status with enhanced validation
export async function getDocument(documentId: string): Promise<{
  id: string
  filename: string
  fileType: string
  fileSize: number
  status: string
  uploadedAt: string
  processedAt?: string
  chunks?: number
  vectors?: number
  error?: string
  url?: string
  blobAccessible?: boolean
} | null> {
  console.log("[STORAGE] Getting document:", documentId)

  try {
    // Get document metadata from KV
    const metadata = await kv.get(`document:${documentId}`)
    if (!metadata) {
      console.log("[STORAGE] Document not found in KV:", documentId)
      return null
    }

    console.log("[STORAGE] Document metadata found:", {
      id: metadata.id,
      name: metadata.name,
      status: metadata.status,
      url: metadata.url ? "present" : "missing",
    })

    // Get processing status and metrics
    const status = (await kv.get(`document:${documentId}:status`)) || "pending"
    const chunks = await kv.get(`document:${documentId}:chunks`)
    const vectors = await kv.get(`document:${documentId}:vectors`)
    const error = await kv.get(`document:${documentId}:error`)

    // Test blob accessibility if URL is present
    let blobAccessible = false
    if (metadata.url) {
      console.log("[STORAGE] Testing blob accessibility for:", metadata.url)
      const accessTest = await testBlobAccess(metadata.url)
      blobAccessible = accessTest.accessible
      console.log("[STORAGE] Blob accessibility test result:", blobAccessible)

      if (!blobAccessible) {
        console.warn("[STORAGE] Blob is not accessible:", accessTest.error)
      }
    }

    const result = {
      id: documentId,
      filename: metadata.filename || metadata.name || "Unknown",
      fileType: metadata.fileType || metadata.type || "unknown",
      fileSize: metadata.fileSize || metadata.size || 0,
      status: typeof status === "object" ? status.status : status,
      uploadedAt: metadata.uploadedAt,
      processedAt: metadata.processedAt,
      chunks: chunks || undefined,
      vectors: vectors || undefined,
      error: error || undefined,
      url: metadata.url,
      blobAccessible,
    }

    console.log("[STORAGE] Returning document data:", {
      id: result.id,
      filename: result.filename,
      status: result.status,
      blobAccessible: result.blobAccessible,
    })

    return result
  } catch (error) {
    console.error(`[STORAGE] Error getting document ${documentId}:`, error)
    return null
  }
}

// Delete document and all associated data with enhanced cleanup
export async function deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  console.log("[STORAGE] Deleting document:", documentId)

  try {
    // Get document metadata
    const document = await kv.get(`document:${documentId}`)

    if (!document) {
      console.log("[STORAGE] Document not found for deletion:", documentId)
      return { success: false, error: "Document not found" }
    }

    console.log("[STORAGE] Document found, proceeding with deletion:", {
      id: document.id,
      name: document.name,
      url: document.url ? "present" : "missing",
    })

    // Delete from Blob if URL exists
    if (document.url) {
      try {
        console.log("[STORAGE] Deleting blob:", document.url)
        await del(document.url)
        console.log("[STORAGE] Blob deleted successfully")
      } catch (blobError) {
        console.error(`[STORAGE] Error deleting blob for document ${documentId}:`, blobError)
        // Continue with deletion even if blob deletion fails
      }
    }

    // Delete vectors from Pinecone
    try {
      console.log("[STORAGE] Deleting vectors from Pinecone")
      const pinecone = createClient()

      // Delete all vectors with matching documentId
      await pinecone.delete({
        filter: {
          documentId: { $eq: documentId },
        },
      })
      console.log("[STORAGE] Vectors deleted from Pinecone")
    } catch (pineconeError) {
      console.error(`[STORAGE] Error deleting vectors for document ${documentId}:`, pineconeError)
      // Continue with deletion even if vector deletion fails
    }

    // Delete metadata from KV - batch delete for efficiency
    const keysToDelete = [
      `document:${documentId}`,
      `document:${documentId}:status`,
      `document:${documentId}:chunks`,
      `document:${documentId}:vectors`,
      `document:${documentId}:error`,
    ]

    console.log("[STORAGE] Deleting KV keys:", keysToDelete)
    await Promise.all(keysToDelete.map((key) => kv.del(key)))
    console.log("[STORAGE] KV keys deleted successfully")

    return { success: true }
  } catch (error) {
    console.error(`[STORAGE] Error deleting document ${documentId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting document",
    }
  }
}

/**
 * Validate document blob accessibility
 * Useful for health checks and debugging
 */
export async function validateDocumentBlob(documentId: string): Promise<{
  exists: boolean
  accessible: boolean
  error?: string
  metadata?: any
}> {
  console.log("[STORAGE] Validating document blob:", documentId)

  try {
    const document = await getDocument(documentId)

    if (!document) {
      return { exists: false, accessible: false, error: "Document not found" }
    }

    if (!document.url) {
      return { exists: true, accessible: false, error: "No blob URL stored" }
    }

    const accessTest = await testBlobAccess(document.url)

    return {
      exists: true,
      accessible: accessTest.accessible,
      error: accessTest.error,
      metadata: accessTest.metadata,
    }
  } catch (error) {
    console.error(`[STORAGE] Error validating document blob ${documentId}:`, error)
    return {
      exists: false,
      accessible: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
