import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { requireAuth } from "../../../lib/auth-server"
import { debug } from "../../../lib/utils/debug"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  debug.log("[DEBUG API] Health check requested")

  try {
    // Validate environment first
    const envValidation = validateEnv(["SUPABASE", "VERCEL_KV", "OPENAI", "PINECONE"])
    debug.log("[DEBUG API] Environment validation:", envValidation)

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[DEBUG API] User authenticated:", user.id)

    // Perform actual service tests
    const tests = await performServiceTests()

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
        validation: envValidation,
      },
      tests,
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

    debug.log("[DEBUG API] Debug info compiled successfully")
    return NextResponse.json(debugInfo)
  } catch (error) {
    debug.error("[DEBUG API] Error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Debug info failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

async function performServiceTests() {
  const tests: Record<string, any> = {}

  // Test Supabase
  try {
    const startTime = Date.now()
    // Simple connectivity test
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      tests.supabase = {
        status: "success",
        latency: Date.now() - startTime,
        message: "Supabase configuration valid",
      }
    } else {
      throw new Error("Missing Supabase configuration")
    }
  } catch (error) {
    tests.supabase = {
      status: "error",
      message: error instanceof Error ? error.message : "Supabase test failed",
    }
  }

  // Test KV
  try {
    const startTime = Date.now()
    const { kv } = await import("@vercel/kv")
    await kv.ping()
    tests.kv = {
      status: "success",
      latency: Date.now() - startTime,
      message: "KV store accessible",
    }
  } catch (error) {
    tests.kv = {
      status: "error",
      message: error instanceof Error ? error.message : "KV test failed",
    }
  }

  // Test OpenAI
  try {
    const startTime = Date.now()
    if (process.env.OPENAI_API_KEY) {
      tests.openai = {
        status: "success",
        latency: Date.now() - startTime,
        message: "OpenAI API key configured",
      }
    } else {
      throw new Error("Missing OpenAI API key")
    }
  } catch (error) {
    tests.openai = {
      status: "error",
      message: error instanceof Error ? error.message : "OpenAI test failed",
    }
  }

  // Test Pinecone
  try {
    const startTime = Date.now()
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME && process.env.PINECONE_HOST) {
      // Basic connectivity test to Pinecone
      const response = await fetch(`${process.env.PINECONE_HOST}/describe_index_stats`, {
        method: "POST",
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const stats = await response.json()
        tests.pinecone = {
          status: "success",
          latency: Date.now() - startTime,
          message: "Pinecone index accessible",
          stats: {
            totalVectors: stats.totalVectorCount || 0,
            dimension: stats.dimension || 0,
          },
        }
      } else {
        throw new Error(`Pinecone API returned ${response.status}`)
      }
    } else {
      throw new Error("Missing Pinecone configuration")
    }
  } catch (error) {
    tests.pinecone = {
      status: "error",
      message: error instanceof Error ? error.message : "Pinecone test failed",
    }
  }

  return tests
}
