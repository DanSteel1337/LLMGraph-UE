import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { requireAuth } from "../../../lib/auth"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    // Validate environment
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    // Get debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email || "",
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
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
