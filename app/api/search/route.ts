/**
 * Vector Search API Route
 * 
 * Purpose: Provides direct access to semantic search functionality without chat context
 * 
 * Features:
 * - Generates embeddings for search queries using OpenAI
 * - Performs vector similarity search in Pinecone
 * - Supports metadata filtering for targeted searches
 * - Returns ranked search results with similarity scores
 * - Includes hybrid search capabilities (vector + keyword)
 * 
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 * 
 * Request Format:
 * POST /api/search
 * {
 *   query: string,           // Search query text
 *   options?: {
 *     topK?: number,         // Number of results to return (default: 5)
 *     filter?: object,       // Pinecone metadata filter
 *     hybridSearch?: boolean // Enable hybrid search (default: false)
 *   }
 * }
 * 
 * Response Format:
 * SearchResult[] where SearchResult = {
 *   id: string,              // Vector/chunk ID
 *   score: number,           // Similarity score (0-1)
 *   text: string,            // Chunk content
 *   metadata?: {             // Document metadata
 *     source: string,        // Original document name
 *     section?: string,      // Document section
 *     documentId: string,    // Document identifier
 *     chunkIndex: number,    // Chunk position
 *     timestamp: string,     // Creation time
 *     heading?: string       // Section heading
 *   }
 * }
 * 
 * Use Cases:
 * - Standalone document search interfaces
 * - Research and exploration tools
 * - Content discovery systems
 * - Integration with external applications
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { createClient } from "@/lib/pinecone/client"
import { searchVectors } from "@/lib/pinecone/search"
import { createEmbedding } from "@/lib/ai/embeddings"
import { createEdgeClient } from "@/lib/supabase-server"

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

    // Generate embedding for the query
    const embedding = await createEmbedding(query)

    // Search for relevant vectors
    const pineconeClient = createClient()
    const searchResults = await searchVectors(pineconeClient, embedding, {
      topK: options.topK || 5,
      filter: options.filter,
      includeMetadata: true,
      hybridSearch: options.hybridSearch,
    })

    return NextResponse.json(searchResults)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to process search request" }, { status: 500 })
  }
}
