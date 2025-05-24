import { NextResponse } from "next/server"

export const runtime = "edge"

// Health check endpoint - intentionally public, no auth required
export async function GET() {
  try {
    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "development",
      environment: process.env.NODE_ENV,
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    console.error("[HEALTH] Error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 },
    )
  }
}
