import type { NextRequest } from "next/server"
import { StreamingTextResponse } from "ai"
import { OpenAIStream } from "ai"
import { validateEnv } from "@/lib/utils/env"
import { searchVectors } from "@/lib/pinecone/search"
import { buildPrompt } from "@/lib/ai/prompts"
import { createEmbedding } from "@/lib/ai/embeddings"
import { createClient } from "@/lib/pinecone/client"
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Parse request
    const { messages, options = {} } = await request.json()
    const lastMessage = messages[messages.length - 1]

    // Generate embedding for the query
    const embedding = await createEmbedding(lastMessage.content)

    // Search for relevant context
    const pineconeClient = createClient()
    const searchResults = await searchVectors(pineconeClient, embedding, {
      topK: options.topK || 5,
      filter: options.filter,
      includeMetadata: true,
    })

    // Build prompt with context
    const prompt = buildPrompt(messages, searchResults)

    // Generate response
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: prompt,
        temperature: options.temperature || 0.7,
        stream: true,
      }),
    })

    // Stream response
    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error("Chat error:", error)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
