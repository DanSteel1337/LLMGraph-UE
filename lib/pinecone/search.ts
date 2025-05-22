/**
 * Purpose: Vector search utilities
 * Logic:
 * - Performs vector search in Pinecone
 * - Implements hybrid search
 * - Deduplicates results
 * Runtime context: Edge Function
 * Services: Pinecone
 */
import type { PineconeRestClient } from "./rest-client"
import type { Message } from "ai"

export interface SearchResult {
  id: string
  score: number
  text: string
  metadata?: Record<string, any>
}

export interface SearchOptions {
  topK?: number
  filter?: Record<string, any>
  includeMetadata?: boolean
  hybridSearch?: boolean
}

export async function searchVectors(
  pineconeClient: PineconeRestClient,
  embedding: number[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { topK = 5, filter, includeMetadata = true, hybridSearch = false } = options

  const queryParams: any = {
    vector: embedding,
    topK,
    includeMetadata,
  }

  if (filter) {
    queryParams.filter = filter
  }

  const results = await pineconeClient.query(queryParams)

  // Transform results
  const searchResults: SearchResult[] =
    results.matches?.map((match) => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text || "",
      metadata: match.metadata,
    })) || []

  // Deduplicate by section
  const deduplicated = deduplicateResults(searchResults)

  return deduplicated
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const deduplicated: SearchResult[] = []

  for (const result of results) {
    const section = result.metadata?.section || ""

    if (!seen.has(section)) {
      seen.add(section)
      deduplicated.push(result)
    }
  }

  return deduplicated
}

// Re-export Message type from AI SDK for convenience
export type { Message }
