import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    // Validate environment
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

    // Get debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        debug: process.env.NEXT_PUBLIC_DEBUG,
        runtime: "edge",
      },
      services: {
        supabase: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        kv: {
          url: !!process.env.KV_REST_API_URL,
          token: !!process.env.KV_REST_API_TOKEN,
        },
        openai: {
          apiKey: !!process.env.OPENAI_API_KEY,
        },
        pinecone: {
          apiKey: !!process.env.PINECONE_API_KEY,
          indexName: !!process.env.PINECONE_INDEX_NAME,
          host: !!process.env.PINECONE_HOST,
        },
      },
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("[DEBUG API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Debug info failed",
      },
      { status: 500 },
    )
  }
}
