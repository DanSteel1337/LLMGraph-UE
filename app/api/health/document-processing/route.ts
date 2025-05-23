/**
 * Document Processing Health Check API Route
 *
 * Purpose: Monitors the health and performance of the document processing service
 *
 * Features:
 * - Checks connectivity to all required services (Blob, KV, Pinecone)
 * - Validates embedding generation functionality
 * - Monitors processing queue status
 * - Returns detailed health metrics
 *
 * Runtime: Vercel Edge Runtime for fast response times
 */

import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { createClient } from "../../../lib/pinecone/client"
import { createEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../../lib/ai/embeddings"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      blob: { status: "unknown" },
      kv: { status: "unknown" },
      pinecone: { status: "unknown" },
      embeddings: { status: "unknown" },
    },
    metrics: {
      activeProcessingJobs: 0,
      recentlyCompletedJobs: 0,
      recentErrors: 0,
      averageProcessingTime: null as number | null,
    },
    responseTime: 0,
  }

  try {
    // Check KV connectivity
    try {
      await kv.set("health-check:document-processing", { timestamp: Date.now() })
      const result = await kv.get("health-check:document-processing")
      healthStatus.services.kv = { status: result ? "healthy" : "degraded" }

      // Get processing metrics from KV
      const processingMetrics = ((await kv.get("document-processing:metrics")) as any) || {}
      healthStatus.metrics = {
        ...healthStatus.metrics,
        ...processingMetrics,
      }
    } catch (error) {
      healthStatus.services.kv = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      healthStatus.status = "degraded"
    }

    // Check Pinecone connectivity
    try {
      const pineconeClient = createClient()
      const stats = await pineconeClient.describeIndexStats()
      healthStatus.services.pinecone = {
        status: "healthy",
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
      }
    } catch (error) {
      healthStatus.services.pinecone = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      healthStatus.status = "degraded"
    }

    // Check embedding generation
    try {
      const embedding = await createEmbedding("This is a test query for the document processing health check.")
      const dimensionsMatch = embedding.length === EMBEDDING_DIMENSIONS

      healthStatus.services.embeddings = {
        status: dimensionsMatch ? "healthy" : "degraded",
        model: EMBEDDING_MODEL,
        dimensions: embedding.length,
        expectedDimensions: EMBEDDING_DIMENSIONS,
      }

      if (!dimensionsMatch) {
        healthStatus.status = "degraded"
      }
    } catch (error) {
      healthStatus.services.embeddings = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      healthStatus.status = "degraded"
    }

    // Check Blob storage (indirectly)
    try {
      // We can't directly check Blob without creating a file,
      // so we'll check if we have access to the Blob token
      const blobTokenSet = !!process.env.BLOB_READ_WRITE_TOKEN
      healthStatus.services.blob = {
        status: blobTokenSet ? "healthy" : "degraded",
        tokenConfigured: blobTokenSet,
      }

      if (!blobTokenSet) {
        healthStatus.status = "degraded"
      }
    } catch (error) {
      healthStatus.services.blob = {
        status: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    // Calculate response time
    healthStatus.responseTime = Date.now() - startTime

    return NextResponse.json(healthStatus)
  } catch (error) {
    console.error("Document processing health check error:", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}
