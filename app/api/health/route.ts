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
 * 
 * Request Format:
 * GET /api/health
 * 
 * Response Format:
 * {
 *   api: { status: "ok" },
 *   pinecone: { 
 *     status: "ok" | "error", 
 *     indexes?: string[],
 *     message?: string 
 *   },
 *   supabase: { 
 *     status: "ok" | "error",
 *     message?: string 
 *   },
 *   kv: { 
 *     status: "ok" | "error",
 *     message?: string 
 *   }
 * }
 * 
 * Status Meanings:
 * - "ok": Service is healthy and responsive
 * - "error": Service is unreachable or malfunctioning
 * - "unknown": Service status could not be determined
 * 
 * Use Cases:
 * - Monitoring and alerting systems
 * - Load balancer health checks
 * - Debugging service connectivity issues
 * - System status dashboards
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/pinecone/client"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

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
      services.pinecone = { status: "ok", indexes: indexes.indexes?.map((i) => i.name) }
    } catch (error) {
      services.pinecone = { status: "error", message: error instanceof Error ? error.message : "Unknown error" }
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
