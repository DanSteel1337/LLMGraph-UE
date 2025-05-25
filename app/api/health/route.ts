import { validateEnv } from "../../../lib/utils/env"
import { requireAuth } from "../../../lib/auth-server"
import { debug } from "../../../lib/utils/debug"

export const runtime = "edge"

export async function GET() {
  debug.log("[HEALTH API] Health check requested")

  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[HEALTH API] User authenticated:", user.id)

    // Validate environment
    const envResult = validateEnv(["OPENAI", "PINECONE", "SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])
    debug.log("[HEALTH API] Environment validation:", envResult)

    const healthStatus = {
      status: envResult.isValid ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      environment: envResult.isValid ? "configured" : "missing_vars",
      user: {
        id: user.id,
        email: user.email || "",
      },
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        pinecone: !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME && process.env.PINECONE_HOST),
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        vercel_blob: !!process.env.BLOB_READ_WRITE_TOKEN,
        vercel_kv: !!process.env.KV_REST_API_URL,
      },
      validation: envResult,
    }

    debug.log("[HEALTH API] Health status compiled:", healthStatus.status)
    return Response.json(healthStatus)
  } catch (error) {
    debug.error("[HEALTH API] Error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

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
