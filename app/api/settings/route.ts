import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "@/lib/supabase"

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
