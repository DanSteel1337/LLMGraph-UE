/**
 * Debug API Route
 *
 * Purpose: Provides diagnostic information and testing for system components
 *
 * Features:
 * - Tests connectivity to Pinecone, OpenAI, and KV
 * - Validates embedding generation
 * - Tests vector operations
 * - Provides detailed diagnostic information
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 */

import { NextResponse } from "next/server"
import { createClient } from "../../../lib/pinecone/client"
import { createEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../../lib/ai/embeddings"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Validate authentication
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Don't validate env variables here since we're checking their status
    // validateEnv()

    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      runtime: "edge",
      tests: {
        pinecone: await testPinecone(),
        openai: await testOpenAI(),
        kv: await testKV(),
      },
      responseTime: 0,
    }

    // Calculate response time
    results.responseTime = Date.now() - startTime

    return NextResponse.json(results)
  } catch (error) {
    console.error("Debug API error:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}

async function testPinecone() {
  const startTime = Date.now()

  try {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.PINECONE_HOST) {
      return {
        status: "error",
        message: "Pinecone environment variables not set",
        latency: Date.now() - startTime,
      }
    }

    const pineconeClient = createClient()

    // Test describeIndexStats
    const stats = await pineconeClient.describeIndexStats()

    // Test vector operations with a test vector
    const testVector = Array(EMBEDDING_DIMENSIONS)
      .fill(0)
      .map(() => Math.random())
    const testId = `test-vector-${Date.now()}`

    // Test upsert
    const upsertResult = await pineconeClient.upsert([
      {
        id: testId,
        values: testVector,
        metadata: { type: "test" },
      },
    ])

    // Test query
    const queryResult = await pineconeClient.query({
      vector: testVector,
      topK: 1,
      includeMetadata: true,
    })

    // Test delete
    const deleteResult = await pineconeClient.delete({ ids: [testId] })

    return {
      status: "success",
      latency: Date.now() - startTime,
      stats: {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        namespaces: Object.keys(stats.namespaces || {}),
      },
      operations: {
        upsert: { status: "success", upsertedCount: upsertResult.upsertedCount },
        query: { status: "success", matchCount: queryResult.matches?.length || 0 },
        delete: { status: "success", deletedCount: deleteResult.deletedCount },
      },
      config: {
        host: sanitizeHost(process.env.PINECONE_HOST),
        indexName: process.env.PINECONE_INDEX_NAME,
        apiKeySet: !!process.env.PINECONE_API_KEY,
      },
    }
  } catch (error) {
    console.error("Pinecone test error:", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - startTime,
    }
  }
}

async function testOpenAI() {
  const startTime = Date.now()

  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: "error",
        message: "OpenAI API key not set",
        latency: Date.now() - startTime,
      }
    }

    // Test embedding generation
    const testText = "This is a test query for the debug API."
    const embedding = await createEmbedding(testText)

    return {
      status: "success",
      latency: Date.now() - startTime,
      model: EMBEDDING_MODEL,
      dimensions: embedding.length,
      expectedDimensions: EMBEDDING_DIMENSIONS,
      dimensionsMatch: embedding.length === EMBEDDING_DIMENSIONS,
    }
  } catch (error) {
    console.error("OpenAI test error:", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - startTime,
    }
  }
}

async function testKV() {
  const startTime = Date.now()

  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return {
        status: "error",
        message: "KV environment variables not set",
        latency: Date.now() - startTime,
      }
    }

    // Test KV operations
    const testKey = `debug-test-${Date.now()}`
    const testValue = { timestamp: Date.now(), test: true }

    // Test set
    await kv.set(testKey, testValue, { ex: 60 }) // 60 second expiry

    // Test get
    const retrievedValue = await kv.get(testKey)

    // Test delete
    await kv.del(testKey)

    // Verify deletion
    const afterDelete = await kv.get(testKey)

    return {
      status: "success",
      latency: Date.now() - startTime,
      operations: {
        set: { status: "success" },
        get: {
          status: "success",
          valueMatch: JSON.stringify(retrievedValue) === JSON.stringify(testValue),
        },
        delete: {
          status: "success",
          deleted: afterDelete === null,
        },
      },
    }
  } catch (error) {
    console.error("KV test error:", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - startTime,
    }
  }
}

function sanitizeHost(host = ""): string {
  // Remove any protocol prefix (http:// or https://)
  return host.replace(/^(https?:\/\/)/, "")
}
