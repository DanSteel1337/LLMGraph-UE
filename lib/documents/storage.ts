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

  return documents
}

export async function getDocument(id: string) {
  return kv.get(`document:${id}`)
}

export async function deleteDocument(id: string) {
  // Get document metadata
  const document = await getDocument(id)

  if (!document) {
    throw new Error("Document not found")
  }

  // Delete from Blob
  if (document.url) {
    await del(document.url)
  }

  // Delete vectors from Pinecone
  const pinecone = createClient()

  // Delete all vectors with matching documentId
  await pinecone.delete({
    filter: {
      documentId: { $eq: id },
    },
  })

  // Delete metadata from KV - batch delete for efficiency
  const keysToDelete = [`document:${id}`, `document:${id}:status`, `document:${id}:chunks`, `document:${id}:vectors`]

  await Promise.all(keysToDelete.map((key) => kv.del(key)))

  return { success: true }
}
