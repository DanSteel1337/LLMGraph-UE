import { kv } from "@vercel/kv"
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"

export const runtime = "edge"

export async function GET() {
  try {
    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

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
    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

    const settings = await request.json()

    // Save settings to KV store
    await kv.set("app:settings", settings)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Settings POST error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
