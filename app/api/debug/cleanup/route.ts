import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../../lib/utils/env"
import { validateAuth, unauthorizedResponse } from "../../../../lib/auth"
import { cleanupOrphanedEntries } from "../../../../lib/documents/storage"
import { kv } from "@vercel/kv"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

    const body = await request.json()
    const { action } = body

    console.log("[CLEANUP API] Received cleanup request:", action, "from user:", user.id)

    switch (action) {
      case "cleanup":
        const result = await cleanupOrphanedEntries()
        console.log("[CLEANUP API] Cleanup result:", result)
        return NextResponse.json(result)

      case "list-keys":
        const allKeys = await kv.keys("document:*")
        console.log("[CLEANUP API] Found keys:", allKeys.length)
        return NextResponse.json({ keys: allKeys, count: allKeys.length })

      case "clear-all":
        const allKeysToDelete = await kv.keys("document:*")
        if (allKeysToDelete.length > 0) {
          await Promise.all(allKeysToDelete.map((key) => kv.del(key)))
        }
        console.log("[CLEANUP API] Cleared all document keys:", allKeysToDelete.length)
        return NextResponse.json({ success: true, deleted: allKeysToDelete.length })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[CLEANUP API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    validateEnv(["SUPABASE", "VERCEL_KV"])

    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

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

    console.log("[CLEANUP API] Key analysis for user:", user.id, "Total keys:", allKeys.length)

    return NextResponse.json({
      total: allKeys.length,
      keysByType,
      allKeys,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("[CLEANUP API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to analyze keys",
      },
      { status: 500 },
    )
  }
}
