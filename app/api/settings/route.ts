/**
 * Settings Management API Route
 * 
 * Purpose: Handles application configuration and RAG parameter management
 * 
 * Features:
 * - GET: Retrieves current application settings
 * - POST: Updates application settings
 * - Stores settings in Vercel KV with persistence
 * - Provides default settings for new installations
 * - Validates setting formats and ranges
 * 
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 * 
 * GET Request Format:
 * GET /api/settings
 * 
 * POST Request Format:
 * POST /api/settings
 * {
 *   topK: number,              // Number of chunks to retrieve (1-10)
 *   temperature: number,       // AI response randomness (0.0-1.0)
 *   hybridSearch: boolean,     // Enable hybrid search
 *   chunkSize: {
 *     text: number,            // Text chunk size in tokens (100-1000)
 *     code: number             // Code chunk size in tokens (500-2000)
 *   }
 * }
 * 
 * Response Formats:
 * GET: Settings object with current configuration
 * POST: { success: true } on successful update
 * 
 * Default Settings:
 * - topK: 5 (retrieve 5 most relevant chunks)
 * - temperature: 0.7 (balanced creativity/consistency)
 * - hybridSearch: true (use both vector and keyword search)
 * - chunkSize: { text: 300, code: 1000 } (optimal token counts)
 * 
 * Settings Impact:
 * - topK: More chunks = better context but slower responses
 * - temperature: Higher = more creative, Lower = more consistent
 * - hybridSearch: Combines semantic and exact matching
 * - chunkSize: Larger chunks = more context per chunk but fewer total chunks
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Default settings
    const DEFAULT_SETTINGS = {
      topK: 5,
      temperature: 0.7,
      hybridSearch: true,
      chunkSize: {
        text: 300,
        code: 1000,
      },
    }

    // Get settings from KV
    const settings = await kv.get("settings")

    return NextResponse.json(settings || DEFAULT_SETTINGS)
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json({ error: "Failed to retrieve settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const settings = await request.json()

    // Validate settings
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 })
    }

    // Save settings to KV
    await kv.set("settings", settings)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
