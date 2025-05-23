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
 * - Implements basic rate limiting
 *
 * Runtime: Vercel Edge Runtime for fast response times
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../lib/pinecone/client"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

// Simple in-memory rate limiting (resets on new deployment)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host ? host.replace(/^(https?:\/\/)/, "") : host
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(ip) || 0

  // Clean up old entries
  if (rateLimitMap.size > 1000) {
    rateLimitMap.clear()
  }

  if (requests >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  rateLimitMap.set(ip, requests + 1)

  // Reset counter after window
  setTimeout(() => {
    rateLimitMap.delete(ip)
  }, RATE_LIMIT_WINDOW)

  return true
}

export async function GET(request: NextRequest) {
  // Basic rate limiting
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    )
  }

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
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 },
    )
  }
}
