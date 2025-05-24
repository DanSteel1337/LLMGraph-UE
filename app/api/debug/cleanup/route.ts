/**
 * Debug Cleanup API Route
 *
 * Purpose: Provides endpoints to clean up orphaned KV entries
 * and validate document integrity
 */

import { type NextRequest, NextResponse } from "next/server"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { cleanupOrphanedDocuments, validateDocumentIntegrity } from "../../../../lib/utils/cleanup"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    switch (action) {
      case "cleanup":
        const cleanupResult = await cleanupOrphanedDocuments()
        return NextResponse.json({
          success: true,
          action: "cleanup",
          result: cleanupResult,
        })

      case "validate":
        const validationResult = await validateDocumentIntegrity()
        return NextResponse.json({
          success: true,
          action: "validate",
          result: validationResult,
        })

      default:
        return NextResponse.json({ error: "Invalid action. Use 'cleanup' or 'validate'" }, { status: 400 })
    }
  } catch (error) {
    console.error("Debug cleanup error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 },
    )
  }
}
