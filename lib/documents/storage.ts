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

export async function getDocuments() {
  const keys = await kv.keys("document:*")
  const documents = []

  for (const key of keys) {
    if (!key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors")) {
      const document = await kv.get(key)
      if (document) {
        documents.push(document)
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

  // Delete metadata from KV
  await kv.del(`document:${id}`)
  await kv.del(`document:${id}:status`)
  await kv.del(`document:${id}:chunks`)
  await kv.del(`document:${id}:vectors`)

  return { success: true }
}
