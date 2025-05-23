/**
 * Enhanced Health Check API Route with Error Tracking
 *
 * Purpose: Monitors the health and connectivity of all system services with comprehensive error tracking
 *
 * Features:
 * - Tests connectivity to Pinecone vector database
 * - Validates Supabase authentication service
 * - Checks Vercel KV storage availability
 * - Returns comprehensive service status
 * - No authentication required (public health endpoint)
 * - Enhanced error tracking and logging
 *
 * Runtime: Vercel Edge Runtime for fast response times
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../lib/pinecone/client"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"
import { parseError, formatErrorForLogging, generateRequestId } from "../../../lib/utils/edge-error-parser"

export const runtime = "edge"

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host ? host.replace(/^(https?:\/\/)/, "") : host
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    console.log(
      "Health check started:",
      JSON.stringify(
        {
          requestId,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    const services = {
      api: { status: "ok" },
      pinecone: { status: "unknown" },
      supabase: { status: "unknown" },
      kv: { status: "unknown" },
    }

    // Check Pinecone
    try {
      const pineconeClient = createClient(requestId)
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
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "health-check-pinecone",
        service: "pinecone",
      })

      console.error("Pinecone health check failed:", JSON.stringify(logEntry, null, 2))

      services.pinecone = {
        status: "error",
        message: parsedError.message,
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
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "health-check-supabase",
        service: "supabase",
      })

      console.error("Supabase health check failed:", JSON.stringify(logEntry, null, 2))

      services.supabase = {
        status: "error",
        message: parsedError.message,
      }
    }

    // Check KV
    try {
      await kv.set("health-check", "ok")
      const result = await kv.get("health-check")
      services.kv = { status: result === "ok" ? "ok" : "error" }
    } catch (error) {
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "health-check-kv",
        service: "vercel-kv",
      })

      console.error("KV health check failed:", JSON.stringify(logEntry, null, 2))

      services.kv = {
        status: "error",
        message: parsedError.message,
      }
    }

    const duration = Date.now() - startTime
    const response = {
      ...services,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
    }

    console.log(
      "Health check completed:",
      JSON.stringify(
        {
          requestId,
          services: Object.fromEntries(Object.entries(services).map(([key, value]) => [key, value.status])),
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    return NextResponse.json(response, {
      headers: {
        "x-request-id": requestId,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      timestamp: new Date().toISOString(),
    })

    const logEntry = formatErrorForLogging(parsedError, {
      requestId,
      timestamp: new Date().toISOString(),
      operation: "health-check-overall",
      duration: `${duration}ms`,
    })

    console.error("Health check failed:", JSON.stringify(logEntry, null, 2))

    return NextResponse.json(
      {
        error: "Health check failed",
        message: parsedError.message,
        requestId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "x-request-id": requestId,
        },
      },
    )
  }
}
