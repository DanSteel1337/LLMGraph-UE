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

export async function GET() {
  try {
    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get settings from KV store
    const settings = (await kv.get("app:settings")) || {}

    return Response.json({ settings })
  } catch (error) {
    console.error("Settings GET error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await request.json()

    // Save settings to KV store
    await kv.set("app:settings", settings)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Settings POST error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
