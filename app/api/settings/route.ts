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
import { validateEnv } from "../../../lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

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

// Validation ranges
const VALIDATION_RULES = {
  topK: { min: 1, max: 10 },
  temperature: { min: 0, max: 1 },
  chunkSize: {
    text: { min: 100, max: 1000 },
    code: { min: 500, max: 2000 },
  },
}

export async function GET(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 })
    }

    // Get settings from KV
    const settings = await kv.get("settings")

    return NextResponse.json(settings || DEFAULT_SETTINGS)
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to retrieve settings",
      },
      { status: 500 },
    )
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
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 })
    }

    // Parse request body
    const settings = await request.json()

    // Validate settings
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Bad Request", message: "Invalid settings format" }, { status: 400 })
    }

    // Validate topK
    if (settings.topK !== undefined) {
      if (
        typeof settings.topK !== "number" ||
        settings.topK < VALIDATION_RULES.topK.min ||
        settings.topK > VALIDATION_RULES.topK.max
      ) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: `topK must be a number between ${VALIDATION_RULES.topK.min} and ${VALIDATION_RULES.topK.max}`,
          },
          { status: 400 },
        )
      }
    }

    // Validate temperature
    if (settings.temperature !== undefined) {
      if (
        typeof settings.temperature !== "number" ||
        settings.temperature < VALIDATION_RULES.temperature.min ||
        settings.temperature > VALIDATION_RULES.temperature.max
      ) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: `temperature must be a number between ${VALIDATION_RULES.temperature.min} and ${VALIDATION_RULES.temperature.max}`,
          },
          { status: 400 },
        )
      }
    }

    // Validate chunkSize
    if (settings.chunkSize) {
      if (settings.chunkSize.text !== undefined) {
        if (
          typeof settings.chunkSize.text !== "number" ||
          settings.chunkSize.text < VALIDATION_RULES.chunkSize.text.min ||
          settings.chunkSize.text > VALIDATION_RULES.chunkSize.text.max
        ) {
          return NextResponse.json(
            {
              error: "Bad Request",
              message: `chunkSize.text must be a number between ${VALIDATION_RULES.chunkSize.text.min} and ${VALIDATION_RULES.chunkSize.text.max}`,
            },
            { status: 400 },
          )
        }
      }

      if (settings.chunkSize.code !== undefined) {
        if (
          typeof settings.chunkSize.code !== "number" ||
          settings.chunkSize.code < VALIDATION_RULES.chunkSize.code.min ||
          settings.chunkSize.code > VALIDATION_RULES.chunkSize.code.max
        ) {
          return NextResponse.json(
            {
              error: "Bad Request",
              message: `chunkSize.code must be a number between ${VALIDATION_RULES.chunkSize.code.min} and ${VALIDATION_RULES.chunkSize.code.max}`,
            },
            { status: 400 },
          )
        }
      }
    }

    // Merge with defaults to ensure all fields are present
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      chunkSize: {
        ...DEFAULT_SETTINGS.chunkSize,
        ...(settings.chunkSize || {}),
      },
    }

    // Save settings to KV
    await kv.set("settings", mergedSettings)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 500 },
    )
  }
}
