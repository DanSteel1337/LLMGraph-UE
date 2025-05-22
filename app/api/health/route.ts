/**
 * Health Check API Route
 *
 * Purpose: Monitors the health and connectivity of all system services
 *
 * Features:
 * - Tests connectivity to Pinecone vector database
 * - Validates Supabase authentication service
 * - Checks Vercel KV storage availability
 * - Returns comprehensive service status
 * - No authentication required (public health endpoint)
 *
 * Runtime: Vercel Edge Runtime for fast response times
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../lib/pinecone/client"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host ? host.replace(/^(https?:\/\/)/, "") : host
}

export async function GET(request: NextRequest) {
  try {
    // Don't validate env variables here since we're checking their status
    // validateEnv()

    const services = {
      api: { status: "ok" },
      pinecone: { status: "unknown" },
      supabase: { status: "unknown" },
      kv: { status: "unknown" },
    }

    // Check Pinecone
    try {
      const pineconeClient = createClient()
      const indexes = await pineconeClient.listIndexes()
      services.pinecone = {
        status: "ok",
        indexes: indexes.indexes?.map((i) => i.name),
        config: {
          host: sanitizeHost(process.env.PINECONE_HOST || ""),
          indexName: process.env.PINECONE_INDEX_NAME,
          apiKeySet: !!process.env.PINECONE_API_KEY,
        },
      }
    } catch (error) {
      services.pinecone = {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        config: {
          host: sanitizeHost(process.env.PINECONE_HOST || ""),
          indexName: process.env.PINECONE_INDEX_NAME,
          apiKeySet: !!process.env.PINECONE_API_KEY,
        },
      }
    }

    // Check Supabase
    try {
      const supabase = createEdgeClient()
      const { data, error } = await supabase.auth.getUser()
      services.supabase = { status: error ? "error" : "ok" }
      if (error) {
        services.supabase.message = error.message
      }
    } catch (error) {
      services.supabase = { status: "error", message: error instanceof Error ? error.message : "Unknown error" }
    }

    // Check KV
    try {
      await kv.set("health-check", "ok")
      const result = await kv.get("health-check")
      services.kv = { status: result === "ok" ? "ok" : "error" }
    } catch (error) {
      services.kv = { status: "error", message: error instanceof Error ? error.message : "Unknown error" }
    }

    return NextResponse.json(services)
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json(
      { error: "Health check failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
