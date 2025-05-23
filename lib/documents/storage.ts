/**
 * Purpose: Document storage utilities
 * Logic:
 * - Manages document storage and retrieval
 * - Handles document metadata
 * Runtime context: Edge Function
 * Services: Vercel Blob (for document storage), Vercel KV (for metadata)
 */
import { del } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"

// Optimized document listing with pagination support
export async function getDocuments(limit = 100, cursor?: string) {
  // Use scan pattern for efficient listing
  const pattern = "document:*"
  const documents = []

  try {
    // Get keys matching pattern
    const keys = await kv.keys(pattern)

    // Filter out status and metric keys
    const documentKeys = keys.filter(
      (key) => !key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors"),
    )

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
            documents.push(doc)
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching documents:", error)
    // Return empty array on error rather than throwing
    return []
  }

  return documents
}

// Get document metadata and status
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
} | null> {
  try {
    // Get document metadata from KV
    const metadata = await kv.get(`document:${documentId}`)
    if (!metadata) {
      return null
    }

    // Get processing status
    const status = (await kv.get(`document:${documentId}:status`)) || "pending"
    const chunks = await kv.get(`document:${documentId}:chunks`)
    const vectors = await kv.get(`document:${documentId}:vectors`)
    const error = await kv.get(`document:${documentId}:error`)

    return {
      id: documentId,
      filename: metadata.filename,
      fileType: metadata.fileType,
      fileSize: metadata.fileSize,
      status: typeof status === "object" ? status.status : status,
      uploadedAt: metadata.uploadedAt,
      processedAt: metadata.processedAt,
      chunks: chunks || undefined,
      vectors: vectors || undefined,
      error: error || undefined,
    }
  } catch (error) {
    console.error(`Error getting document ${documentId}:`, error)
    return null
  }
}

// Delete document and all associated data
export async function deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get document metadata
    const document = await kv.get(`document:${documentId}`)

    if (!document) {
      return { success: false, error: "Document not found" }
    }

    // Delete from Blob if URL exists
    if (document.url) {
      try {
        await del(document.url)
      } catch (error) {
        console.error(`Error deleting blob for document ${documentId}:`, error)
        // Continue with deletion even if blob deletion fails
      }
    }

    // Delete vectors from Pinecone
    try {
      const pinecone = createClient()

      // Delete all vectors with matching documentId
      await pinecone.delete({
        filter: {
          documentId: { $eq: documentId },
        },
      })
    } catch (error) {
      console.error(`Error deleting vectors for document ${documentId}:`, error)
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

    await Promise.all(keysToDelete.map((key) => kv.del(key)))

    return { success: true }
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting document",
    }
  }
}
