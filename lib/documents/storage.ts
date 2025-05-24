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
    console.log("[STORAGE] All keys:", allKeys)

    // Filter to get only main document keys (not status/chunks/vectors/etc.)
    const documentKeys = allKeys.filter((key) => {
      // Main document keys should be in format: document:{id}
      // Exclude keys with additional suffixes
      const parts = key.split(":")
      const isMainDocumentKey = parts.length === 2 && parts[0] === "document"

      console.log("[STORAGE] Checking key:", key, "isMainDocumentKey:", isMainDocumentKey)
      return isMainDocumentKey
    })

    console.log("[STORAGE] Filtered document keys:", documentKeys.length)
    console.log("[STORAGE] Document keys:", documentKeys)

    if (documentKeys.length === 0) {
      console.log("[STORAGE] No valid document keys found")
      return []
    }

    // Get documents in batches and validate each one
    const documents = []
    const batchSize = 20
    const keysToCleanup = []

    for (let i = 0; i < Math.min(documentKeys.length, limit); i += batchSize) {
      const batch = documentKeys.slice(i, i + batchSize)
      console.log("[STORAGE] Processing batch:", batch)

      const batchResults = await Promise.all(batch.map((key) => kv.get(key)))

      for (let j = 0; j < batch.length; j++) {
        const doc = batchResults[j]
        const key = batch[j]

        console.log("[STORAGE] Processing document from key:", key, "doc:", doc)

        // Validate document has required fields
        if (!doc || typeof doc !== "object") {
          console.warn("[STORAGE] Invalid document object found, marking for cleanup:", key, doc)
          keysToCleanup.push(key)
          continue
        }

        if (!doc.id || !doc.name) {
          console.warn("[STORAGE] Document missing required fields, marking for cleanup:", key, {
            hasId: !!doc.id,
            hasName: !!doc.name,
            doc,
          })
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
        if (normalizedDoc.id && normalizedDoc.id !== "undefined" && normalizedDoc.id.trim() !== "") {
          console.log("[STORAGE] Adding valid document:", {
            id: normalizedDoc.id,
            name: normalizedDoc.name,
            size: normalizedDoc.size,
          })
          documents.push(normalizedDoc)
        } else {
          console.warn("[STORAGE] Document with invalid ID, marking for cleanup:", normalizedDoc)
          keysToCleanup.push(key)
        }
      }
    }

    // Enhanced cleanup for orphaned document keys
    if (keysToCleanup.length > 0) {
      console.log("[STORAGE] Cleaning up", keysToCleanup.length, "invalid document entries:", keysToCleanup)

      // Also clean up related orphaned keys for the same document IDs
      const orphanedDocIds = new Set<string>()
      keysToCleanup.forEach((key) => {
        const parts = key.split(":")
        if (parts.length >= 2) {
          orphanedDocIds.add(parts[1])
        }
      })

      // Find and clean up all related keys for orphaned documents
      const additionalKeysToCleanup: string[] = []
      for (const docId of orphanedDocIds) {
        const relatedKeys = allKeys.filter((key) => key.includes(docId))
        additionalKeysToCleanup.push(...relatedKeys)
      }

      const allKeysToCleanup = [...new Set([...keysToCleanup, ...additionalKeysToCleanup])]

      Promise.all(allKeysToCleanup.map((key) => kv.del(key))).catch((error) => {
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
      `document:${documentId}:content-length`,
      `document:${documentId}:processed-at`,
      `document:${documentId}:processing-results`,
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

/**
 * Clean up orphaned KV entries
 * Useful for maintenance and debugging
 */
export async function cleanupOrphanedEntries(): Promise<{
  success: boolean
  cleaned: number
  errors: string[]
}> {
  console.log("[STORAGE] Starting cleanup of orphaned entries")

  try {
    const allKeys = await kv.keys("document:*")
    console.log("[STORAGE] Found", allKeys.length, "total document-related keys")

    const keysToDelete = []
    const errors = []

    // Group keys by document ID
    const keysByDocId = new Map<string, string[]>()

    for (const key of allKeys) {
      const parts = key.split(":")
      if (parts.length >= 2 && parts[0] === "document") {
        const docId = parts[1]
        if (!keysByDocId.has(docId)) {
          keysByDocId.set(docId, [])
        }
        keysByDocId.get(docId)!.push(key)
      }
    }

    // Check each document group
    for (const [docId, keys] of keysByDocId) {
      const mainKey = `document:${docId}`
      const hasMainDocument = keys.includes(mainKey)

      if (!hasMainDocument) {
        // No main document, mark all related keys for deletion
        console.log("[STORAGE] Found orphaned keys for document", docId, ":", keys)
        keysToDelete.push(...keys)
      } else {
        // Check if main document is valid
        try {
          const doc = await kv.get(mainKey)
          if (!doc || !doc.id || !doc.name) {
            console.log("[STORAGE] Found invalid main document", docId, "marking all keys for deletion")
            keysToDelete.push(...keys)
          }
        } catch (error) {
          console.error("[STORAGE] Error checking document", docId, ":", error)
          errors.push(`Error checking document ${docId}: ${error}`)
        }
      }
    }

    // Delete orphaned keys
    if (keysToDelete.length > 0) {
      console.log("[STORAGE] Deleting", keysToDelete.length, "orphaned keys:", keysToDelete)
      await Promise.all(keysToDelete.map((key) => kv.del(key)))
    }

    return {
      success: true,
      cleaned: keysToDelete.length,
      errors,
    }
  } catch (error) {
    console.error("[STORAGE] Error during cleanup:", error)
    return {
      success: false,
      cleaned: 0,
      errors: [error instanceof Error ? error.message : "Unknown cleanup error"],
    }
  }
}
