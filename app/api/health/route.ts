import { createEdgeClient } from "../../../lib/supabase-server"
import { validateEnv } from "../../../lib/utils/env"
import { testPineconeConnection } from "../../../lib/pinecone/client"

export const runtime = "edge"

export async function GET() {
  try {
    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate environment
    const envResult = validateEnv(["openai", "pinecone", "supabase", "blob", "kv"])

    // Test service connections
    const pineconeHealth = await testPineconeConnection()

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: envResult.isValid,
      services: {
        supabase: !!user,
        pinecone: pineconeHealth,
        openai: envResult.groups.openai,
        blob: envResult.groups.blob,
        kv: envResult.groups.kv,
      },
    }

    return Response.json(health)
  } catch (error) {
    console.error("Health check error:", error)
    return Response.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
