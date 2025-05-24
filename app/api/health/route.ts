import { validateEnv } from "../../../lib/utils/env"
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"

export const runtime = "edge"

export async function GET() {
  try {
    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

    // Validate environment
    const envResult = validateEnv(["openai", "pinecone", "supabase", "blob"])

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: envResult.isValid ? "configured" : "missing_vars",
      user: {
        id: user.id,
        email: user.email,
      },
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        pinecone: !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME),
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        vercel_blob: !!process.env.BLOB_READ_WRITE_TOKEN,
        vercel_kv: !!process.env.KV_REST_API_URL,
      },
    }

    return Response.json(healthStatus)
  } catch (error) {
    console.error("Health check error:", error)
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
