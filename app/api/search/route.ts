/**
 * Vector Search API Route
 *
 * Purpose: Provides direct access to semantic search functionality without chat context
 *
 * Features:
 * - Generates embeddings for search queries using OpenAI text-embedding-3-large
 * - Performs vector similarity search in Pinecone
 * - Supports metadata filtering for targeted searches
 * - Returns ranked search results with similarity scores
 * - Includes hybrid search capabilities (vector + keyword)
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { createClient } from "../../../lib/pinecone/client"
import { searchVectors } from "../../../lib/pinecone/search"
import { createEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../../lib/ai/embeddings"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "OPENAI", "PINECONE"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const { query, options = {} } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Generate embedding for the query using text-embedding-3-large
    const embedding = await createEmbedding(query)

    // Validate embedding dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}. Model: ${EMBEDDING_MODEL}`,
      )
    }

    // Search for relevant vectors
    const pineconeClient = createClient()
    const searchResults = await searchVectors(pineconeClient, embedding, {
      topK: options.topK || 5,
      filter: options.filter,
      includeMetadata: true,
      hybridSearch: options.hybridSearch,
    })

    return NextResponse.json({
      results: searchResults,
      metadata: {
        embeddingModel: EMBEDDING_MODEL,
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        query: query,
        topK: options.topK || 5,
      },
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to process search request" }, { status: 500 })
  }
}
