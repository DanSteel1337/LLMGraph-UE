import { NextResponse } from "next/server"
import { createClient } from "../../../lib/supabase-server"
import { validateEnv } from "../../../lib/utils/env"

export const runtime = "edge"

export async function GET() {
  const services: Record<string, { status: "ok" | "error"; message?: string }> = {}

  // Check environment variables
  try {
    validateEnv()
    services.env = { status: "ok" }
  } catch (error) {
    services.env = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error validating environment variables",
    }
  }

  // Check Supabase connection
  try {
    const supabase = createClient()
    const { error } = await supabase.from("health_check").select("count").single()

    if (error) {
      throw new Error(error.message)
    }

    services.supabase = { status: "ok" }
  } catch (error) {
    services.supabase = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error connecting to Supabase",
    }
  }

  // Check OpenAI connection
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    services.openai = { status: "ok" }
  } catch (error) {
    services.openai = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error connecting to OpenAI",
    }
  }

  // Check Pinecone connection
  try {
    const host = `https://${process.env.PINECONE_INDEX_NAME}-${process.env.PINECONE_PROJECT_ID}.svc.${process.env.PINECONE_ENVIRONMENT}.pinecone.io`

    const response = await fetch(`${host}/describe_index_stats`, {
      method: "GET",
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY || "",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Pinecone API returned ${response.status}`)
    }

    services.pinecone = { status: "ok" }
  } catch (error) {
    services.pinecone = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error connecting to Pinecone",
    }
  }

  // Overall status
  const overallStatus = Object.values(services).every((s) => s.status === "ok") ? "ok" : "error"

  return NextResponse.json({
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
  })
}
