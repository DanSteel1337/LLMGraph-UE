import { requireAuth } from "../../../lib/auth-server"
import { createEmbedding } from "../../../lib/ai/embeddings"
import { searchVectors } from "../../../lib/pinecone/search"
import { validateEnv } from "../../../lib/utils/env"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // Validate environment
    const envResult = validateEnv(["openai", "pinecone"])
    if (!envResult.isValid) {
      return Response.json({ error: "Environment configuration error" }, { status: 500 })
    }

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    const { query, limit = 5 } = await request.json()

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 })
    }

    // Generate embedding for the search query
    const embedding = await createEmbedding(query)

    // Search for relevant documents
    const results = await searchVectors(embedding, limit)

    return Response.json({ results })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.error("Search API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
