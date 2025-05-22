import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { createClient } from "@/lib/pinecone/client"
import { searchVectors } from "@/lib/pinecone/search"
import { createEmbedding } from "@/lib/ai/embeddings"
import { createEdgeClient } from "@/lib/supabase"

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
