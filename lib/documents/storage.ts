/**
 * Document Storage Utilities
 * 
 * Purpose: Manages document storage, retrieval, and deletion
 * 
 * Features:
 * - Document metadata management in Vercel KV
 * - Document file storage in Vercel Blob
 * - Vector deletion from Pinecone
 * - Type-safe document operations
 * 
 * Services:
 * - Vercel KV: Document metadata
 * - Vercel Blob: Document files
 * - Pinecone: Vector embeddings
 * 
 * Runtime context: Edge Function
 */
import { del } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { createClient } from "../pinecone/client"

// Document type definition
export interface Document {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
  status: "uploaded" | "processing" | "processed" | "error"
  error?: string
  chunkCount?: number
  vectorCount?: number
  uploadedBy?: string
  processingStartedAt?: string
  processingCompletedAt?: string
}

/**
 * Get all documents from storage
 * @returns Array of document metadata
 */
export async function getDocuments(): Promise<Document[]> {
  const keys = await kv.keys("document:*")
  const documents: Document[] = []

  for (const key of keys) {
    // Skip status and chunk keys
    if (!key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors")) {
      const document = await kv.get<Document>(key)
      if (document) {
        documents.push(document)
      }
    }
  }

  // Sort by upload date (newest first)
  return documents.sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )
}

/**
 * Get a specific document by ID
 * @param id Document ID
 * @returns Document metadata or null if not found
 */
export async function getDocument(id: string): Promise<Document | null> {
  return kv.get<Document>(`document:${id}`)
}

/**
 * Delete a document and all associated data
 * @param id Document ID
 * @returns Success status
 */
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  // Get document metadata
  const document = await getDocument(id)

  if (!document) {
    throw new Error("Document not found")
  }

  // Delete from Blob storage
  if (document.url) {
    try {
      await del(document.url)
    } catch (error) {
      console.error("Failed to delete blob:", error)
      // Continue with cleanup even if blob deletion fails
    }
  }

  // Delete vectors from Pinecone
  try {
    const pinecone = createClient()
    
    // Delete all vectors with matching documentId
    await pinecone.delete({
      filter: {
        documentId: { $eq: id },
      },
    })
  } catch (error) {
    console.error("Failed to delete vectors from Pinecone:", error)
    // Continue with cleanup even if Pinecone deletion fails
  }

  // Delete all metadata from KV
  const keysToDelete = [
    `document:${id}`,
    `document:${id}:status`,
    `document:${id}:chunks`,
    `document:${id}:vectors`,
  ]

  for (const key of keysToDelete) {
    try {
      await kv.del(key)
    } catch (error) {
      console.error(`Failed to delete KV key ${key}:`, error)
    }
  }

  return { success: true }
}

/**
 * Update document status
 * @param id Document ID
 * @param status New status
 * @param additionalData Optional additional data to store
 */
export async function updateDocumentStatus(
  id: string,
  status: Document['status'],
  additionalData?: Partial<Document>
): Promise<void> {
  const document = await getDocument(id)
  
  if (!document) {
    throw new Error("Document not found")
  }

  await kv.set(
    `document:${id}`,
    {
      ...document,
      status,
      ...additionalData,
    },
    { ex: status === "processed" ? 86400 : 3600 } // 24h for processed, 1h for others
  )
}
