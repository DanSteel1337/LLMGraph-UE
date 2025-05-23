import { kv } from "./kv" // Updated import to use our kv module

export async function getDocuments(limit = 100, cursor?: string) {
  // Use scan pattern for efficient listing
  const pattern = "document:*"
  const documents: any[] = []

  try {
    // Get keys matching pattern
    const keys = await kv.keys(pattern)

    // Filter out status and metric keys
    const documentKeys = keys.filter(
      (key: string) => !key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors"),
    )

    // Batch get for efficiency
    if (documentKeys.length > 0) {
      // Get documents in batches to avoid memory issues
      const batchSize = 20
      for (let i = 0; i < Math.min(documentKeys.length, limit); i += batchSize) {
        const batch = documentKeys.slice(i, i + batchSize)
        const batchPromises = batch.map((key: string) => kv.get(key))
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

export async function getDocument(supabase: any, documentId: string) {
  try {
    const document = await kv.get(`document:${documentId}`)

    if (!document) {
      return { data: null, error: null }
    }

    // Get additional metadata
    const [status, chunkCount, vectorCount] = await Promise.all([
      kv.get(`document:${documentId}:status`),
      kv.get(`document:${documentId}:chunks`),
      kv.get(`document:${documentId}:vectors`),
    ])

    return {
      data: {
        ...document,
        status: status || "unknown",
        chunkCount,
        vectorCount,
      },
      error: null,
    }
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
