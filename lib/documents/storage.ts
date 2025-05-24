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

// Enhanced document listing with proper validation and cleanup
export async function getDocuments(limit = 100, cursor?: string) {
  console.log("[STORAGE] Getting documents, limit:", limit)

  try {
    // Get all keys matching the document pattern
    const allKeys = await kv.keys("document:*")
    console.log("[STORAGE] Found total keys:", allKeys.length)

    // Filter to get only main document keys (not status/chunks/vectors)
    const documentKeys = allKeys.filter(
      (key) =>
        !key.includes(":status") &&
        !key.includes(":chunks") &&
        !key.includes(":vectors") &&
        !key.includes(":error") &&
        !key.includes(":content-length") &&
        !key.includes(":processed-at") &&
        !key.includes(":processing-results"),
    )

    console.log("[STORAGE] Filtered document keys:", documentKeys.length)

    if (documentKeys.length === 0) {
      return []
    }

    // Get documents in batches and validate each one
    const documents = []
    const batchSize = 20
    const keysToCleanup = []

    for (let i = 0; i < Math.min(documentKeys.length, limit); i += batchSize) {
      const batch = documentKeys.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((key) => kv.get(key)))

      for (let j = 0; j < batch.length; j++) {
        const doc = batchResults[j]
        const key = batch[j]

        // Validate document has required fields
        if (!doc || !doc.id || !doc.name) {
          console.warn("[STORAGE] Invalid document found, marking for cleanup:", key, doc)
          keysToCleanup.push(key)
          continue
        }

        // Normalize and validate document
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
          blobMetadata: doc.blobMetadata,
        }

        // Only include documents with valid IDs
        if (normalizedDoc.id && normalizedDoc.id !== "undefined") {
          documents.push(normalizedDoc)
        } else {
          console.warn("[STORAGE] Document with invalid ID, marking for cleanup:", normalizedDoc)
          keysToCleanup.push(key)
        }
      }
    }

    // Clean up invalid entries asynchronously
    if (keysToCleanup.length > 0) {
      console.log("[STORAGE] Cleaning up", keysToCleanup.length, "invalid document entries")
      Promise.all(keysToCleanup.map((key) => kv.del(key))).catch((error) => {
        console.error("[STORAGE] Error cleaning up invalid entries:", error)
      })
    }

    console.log("[STORAGE] Retrieved valid documents:", documents.length)
    return documents
  } catch (error) {
    console.error("[STORAGE] Error fetching documents:", error)
    return []
  }
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
