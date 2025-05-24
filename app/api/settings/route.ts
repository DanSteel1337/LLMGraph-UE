import { kv } from "@vercel/kv"
import { requireAuth } from "../../../lib/auth"

export const runtime = "edge"

export async function GET() {
  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    // Get settings from KV store
    const settings = (await kv.get("app:settings")) || {}

    return Response.json({ settings })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
    console.error("Settings GET error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    const settings = await request.json()

    // Save settings to KV store
    await kv.set("app:settings", settings)

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
    console.error("Settings POST error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
