import { kv } from "@vercel/kv"
import { requireAuth } from "../../../lib/auth"

export const runtime = "edge"

export async function GET(request: Request) {
  try {
    // Single source of truth auth validation
    await requireAuth()

    // Get settings from KV store
    const settings = (await kv.get("app:settings")) || {}

    return Response.json({ settings })
  } catch (error) {
    console.error("Settings GET error:", error)

    // Check if this is an auth error
    if (error instanceof Error && error.message.includes("Authentication")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Single source of truth auth validation
    await requireAuth()

    const settings = await request.json()

    // Save settings to KV store
    await kv.set("app:settings", settings)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Settings POST error:", error)

    // Check if this is an auth error
    if (error instanceof Error && error.message.includes("Authentication")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
