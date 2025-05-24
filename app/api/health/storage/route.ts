import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { requireAuth } from "../../../../lib/auth"

export const runtime = "edge"

export async function GET() {
  try {
    // Single source of truth auth validation
    await requireAuth()

    // Check KV store
    const kvPing = await kv.ping()
    const kvStatus = kvPing === "PONG" ? "ok" : "error"

    // Get document count
    const documentKeys = await kv.keys("document:*")
    const documentCount = documentKeys.length

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      storage: {
        kv: {
          status: kvStatus,
          documentCount,
        },
      },
    })
  } catch (error) {
    console.error("[STORAGE HEALTH] Error:", error)

    // Check if this is an auth error
    if (error instanceof Error && error.message.includes("Authentication")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Storage health check failed",
      },
      { status: 500 },
    )
  }
}
