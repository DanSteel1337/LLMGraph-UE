import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../../lib/utils/env"
import { requireAuth } from "../../../../lib/auth-server"
import { cleanupOrphanedEntries } from "../../../../lib/documents/storage"
import { debug } from "../../../../lib/utils/debug"
import { kv } from "@vercel/kv"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  debug.log("[DEBUG CLEANUP] Cleanup request received")

  try {
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[DEBUG CLEANUP] User authenticated:", user.id)

    const body = await request.json()
    const { action } = body
    debug.log("[DEBUG CLEANUP] Action requested:", action)

    switch (action) {
      case "cleanup":
        const result = await cleanupOrphanedEntries()
        debug.log("[DEBUG CLEANUP] Cleanup result:", result)
        return NextResponse.json(result)

      case "list-keys":
        const allKeys = await kv.keys("document:*")
        debug.log("[DEBUG CLEANUP] Found keys:", allKeys.length)
        return NextResponse.json({ keys: allKeys, count: allKeys.length })

      case "clear-all":
        const allKeysToDelete = await kv.keys("document:*")
        if (allKeysToDelete.length > 0) {
          await Promise.all(allKeysToDelete.map((key) => kv.del(key)))
        }
        debug.log("[DEBUG CLEANUP] Cleared all document keys:", allKeysToDelete.length)
        return NextResponse.json({ success: true, deleted: allKeysToDelete.length })

      default:
        debug.warn("[DEBUG CLEANUP] Invalid action:", action)
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    debug.error("[DEBUG CLEANUP] Error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Cleanup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  debug.log("[DEBUG CLEANUP] Key analysis requested")

  try {
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[DEBUG CLEANUP] User authenticated for analysis:", user.id)

    // Get all document-related keys for inspection
    const allKeys = await kv.keys("document:*")

    // Group keys by type for better analysis
    const keysByType = {
      main: [] as string[],
      status: [] as string[],
      chunks: [] as string[],
      vectors: [] as string[],
      error: [] as string[],
      other: [] as string[],
    }

    for (const key of allKeys) {
      if (key.includes(":status")) {
        keysByType.status.push(key)
      } else if (key.includes(":chunks")) {
        keysByType.chunks.push(key)
      } else if (key.includes(":vectors")) {
        keysByType.vectors.push(key)
      } else if (key.includes(":error")) {
        keysByType.error.push(key)
      } else if (key.split(":").length === 2) {
        keysByType.main.push(key)
      } else {
        keysByType.other.push(key)
      }
    }

    debug.log("[DEBUG CLEANUP] Key analysis completed. Total keys:", allKeys.length)

    return NextResponse.json({
      total: allKeys.length,
      keysByType,
      allKeys,
      user: {
        id: user.id,
        email: user.email || "",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    debug.error("[DEBUG CLEANUP] Analysis error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to analyze keys",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
