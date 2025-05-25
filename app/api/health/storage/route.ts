/**
 * Purpose: Storage health check and cleanup endpoint
 * Logic: Check for orphaned keys and provide cleanup functionality
 * Runtime context: Edge Function
 */
export const runtime = "edge"

import { requireAuth } from "../../../../lib/auth-server"
import { cleanupOrphanedEntries } from "../../../../lib/documents/storage"
import { debug } from "../../../../lib/utils/debug"
import { kv } from "@vercel/kv"

export async function GET() {
  debug.log("[STORAGE HEALTH] Storage health check requested")

  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[STORAGE HEALTH] User authenticated:", user.id)

    // Get all document-related keys
    const allKeys = await kv.keys("document:*")
    debug.log("[STORAGE HEALTH] Found total keys:", allKeys.length)

    // Analyze key patterns
    const keysByDocId = new Map<string, string[]>()
    const orphanedKeys: string[] = []

    for (const key of allKeys) {
      const parts = key.split(":")
      if (parts.length >= 2) {
        const docId = parts[1]
        if (!keysByDocId.has(docId)) {
          keysByDocId.set(docId, [])
        }
        keysByDocId.get(docId)!.push(key)
      }
    }

    // Check for orphaned documents
    for (const [docId, keys] of keysByDocId) {
      const hasMainDocument = keys.includes(`document:${docId}`)
      if (!hasMainDocument) {
        orphanedKeys.push(...keys)
      }
    }

    const healthStatus = {
      totalKeys: allKeys.length,
      totalDocuments: keysByDocId.size,
      orphanedKeys: orphanedKeys.length,
      orphanedDocuments:
        orphanedKeys.length > 0
          ? Array.from(keysByDocId.keys()).filter((docId) => !keysByDocId.get(docId)!.includes(`document:${docId}`))
          : [],
      status: orphanedKeys.length === 0 ? "healthy" : "needs_cleanup",
    }

    debug.log("[STORAGE HEALTH] Health status:", healthStatus.status, "Orphaned keys:", orphanedKeys.length)

    return Response.json({
      success: true,
      storage: healthStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    debug.error("[STORAGE HEALTH] Error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Storage health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  debug.log("[STORAGE HEALTH] Storage cleanup requested")

  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    debug.log("[STORAGE HEALTH] User authenticated for cleanup:", user.id)

    // Perform cleanup
    const cleanupResult = await cleanupOrphanedEntries()
    debug.log("[STORAGE HEALTH] Cleanup completed:", cleanupResult)

    return Response.json({
      success: true,
      cleanup: cleanupResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    debug.error("[STORAGE HEALTH] Cleanup error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Storage cleanup failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
