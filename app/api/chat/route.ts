import { createEdgeClient } from "../../../lib/supabase-server"
import { createEmbedding } from "../../../lib/ai/embeddings"
import { searchVectors } from "../../../lib/pinecone/search"
import { buildRAGPrompt } from "../../../lib/ai/prompts"
import { streamChatCompletion } from "../../../lib/ai/chat"
import { validateEnv } from "../../../lib/utils/env"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // Validate environment
    const envResult = validateEnv(["openai", "pinecone"])
    if (!envResult.isValid) {
      return Response.json({ error: "Environment configuration error" }, { status: 500 })
    }

    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages } = await request.json()
    const lastMessage = messages[messages.length - 1]?.content

    if (!lastMessage) {
      return Response.json({ error: "No message provided" }, { status: 400 })
    }

    // Generate embedding for the query
    const embedding = await createEmbedding(lastMessage)

    // Search for relevant documents
    const searchResults = await searchVectors(embedding, 5)

    // Build RAG prompt with context
    const prompt = buildRAGPrompt(lastMessage, searchResults)

    // Stream the response
    return streamChatCompletion([...messages.slice(0, -1), { role: "user", content: prompt }])
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
