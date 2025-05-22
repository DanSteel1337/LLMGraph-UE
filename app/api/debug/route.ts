/**
 * Debug API Route
 *
 * Purpose: Provides endpoints for testing and debugging system components
 *
 * Features:
 * - Tests Pinecone connectivity and operations
 * - Tests OpenAI embedding generation
 * - Tests Vercel KV operations
 * - Returns detailed diagnostic information
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../lib/utils/env"
import { PineconeRestClient } from "../../../lib/pinecone/rest-client"
import { createEmbedding } from "../../../lib/ai/embeddings"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"
import { retry } from "../../../lib/utils/retry"

export const runtime = "edge"

// Constants for embedding dimensions
const EMBEDDING_DIMENSIONS = 3072 // text-embedding-3-large

// Add this function at the top of the file, after the imports
function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host.replace(/^(https?:\/\/)/, "")
}

export async function GET(request: NextRequest) {
  try {
    // Validate only the environment variables needed for this route
    validateEnv(["SUPABASE", "OPENAI", "PINECONE", "VERCEL_KV"])

    try {
      // Validate authentication using edge client
      const supabase = createEdgeClient()
      const { data, error } = await supabase.auth.getUser()

      if (error || !data.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || "development",
        runtime: "edge",
        tests: {
          pinecone: await testPinecone(),
          openai: await testOpenAI(),
          kv: await testKV(),
        },
      }

      return NextResponse.json(results)
    } catch (error) {
      console.error("Debug API error:", error)
      return NextResponse.json(
        { error: "Debug API failed", message: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 },
      )
    }
  } catch (envError) {
    // Handle environment validation errors separately
    console.error("Environment validation error:", envError)
    return NextResponse.json(
      {
        error: "Environment configuration error",
        message: envError instanceof Error ? envError.message : "Missing required environment variables",
      },
      { status: 500 },
    )
  }
}

async function testPinecone() {
  try {
    const startTime = Date.now()

    // Sanitize the host value
    const host = sanitizeHost(process.env.PINECONE_HOST!)

    // Log environment variables for debugging (will be removed in production)
    console.log("Debug - Pinecone Environment Variables:", {
      apiKey: process.env.PINECONE_API_KEY ? "Set (redacted)" : "Not set",
      indexName: process.env.PINECONE_INDEX_NAME,
      host: host, // Use sanitized host
      expectedDimensions: EMBEDDING_DIMENSIONS,
    })

    // Create a new client instance specifically for debugging
    // This ensures we're using the latest environment variables
    const pineconeClient = new PineconeRestClient({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME!,
      host: host, // Use sanitized host
    })

    // Test 1: Get index stats
    let statsResult
    try {
      statsResult = await retry(async () => await pineconeClient.describeIndexStats(), {
        retries: 2,
        minTimeout: 500,
      })
    } catch (error) {
      return {
        status: "error",
        message: `Failed to get index stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }

    // Test 2: Generate a real embedding for testing
    let testEmbedding
    try {
      testEmbedding = await createEmbedding("This is a test query for debugging the Pinecone vector database.")
    } catch (error) {
      return {
        status: "error",
        message: `Failed to generate test embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
        stats: statsResult,
      }
    }

    // Verify embedding dimensions
    if (testEmbedding.length !== EMBEDDING_DIMENSIONS) {
      return {
        status: "error",
        message: `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${testEmbedding.length}`,
        stats: statsResult,
      }
    }

    // Test 3: Create a test vector with real embedding
    const testVector = {
      id: `debug-test-${Date.now()}`,
      values: testEmbedding, // Use real embedding instead of random values
      metadata: {
        text: "This is a test vector for debugging the Pinecone vector database.",
        source: "debug-api",
        timestamp: new Date().toISOString(),
        embeddingModel: "text-embedding-3-large",
        dimensions: EMBEDDING_DIMENSIONS,
      },
    }

    let upsertResult
    try {
      upsertResult = await retry(async () => await pineconeClient.upsert([testVector]), {
        retries: 2,
        minTimeout: 500,
      })
    } catch (error) {
      return {
        status: "error",
        message: `Failed to upsert test vector: ${error instanceof Error ? error.message : "Unknown error"}`,
        stats: statsResult,
        embeddingInfo: {
          dimensions: testEmbedding.length,
          expectedDimensions: EMBEDDING_DIMENSIONS,
        },
      }
    }

    // Test 4: Query the test vector
    let queryResult
    try {
      queryResult = await retry(
        async () =>
          await pineconeClient.query({
            vector: testVector.values,
            topK: 1,
            includeMetadata: true,
          }),
        { retries: 2, minTimeout: 500 },
      )
    } catch (error) {
      return {
        status: "error",
        message: `Failed to query test vector: ${error instanceof Error ? error.message : "Unknown error"}`,
        stats: statsResult,
        operations: {
          upsert: { status: "success", result: upsertResult },
        },
      }
    }

    // Test 5: Delete the test vector
    let deleteResult
    try {
      deleteResult = await retry(async () => await pineconeClient.delete({ ids: [testVector.id] }), {
        retries: 2,
        minTimeout: 500,
      })
    } catch (error) {
      return {
        status: "error",
        message: `Failed to delete test vector: ${error instanceof Error ? error.message : "Unknown error"}`,
        stats: statsResult,
        operations: {
          upsert: { status: "success", result: upsertResult },
          query: { status: "success", result: queryResult },
        },
      }
    }

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      stats: {
        totalVectors: statsResult.totalVectorCount,
        dimension: statsResult.dimension,
        namespaces: Object.keys(statsResult.namespaces || {}),
      },
      operations: {
        embedding: { status: "success", dimensions: testEmbedding.length },
        upsert: { status: "success", result: upsertResult },
        query: { status: "success", result: queryResult },
        delete: { status: "success", result: deleteResult },
      },
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}

async function testOpenAI() {
  try {
    const startTime = Date.now()

    // Test embedding generation with text-embedding-3-large
    const embedding = await createEmbedding("This is a test query for debugging the OpenAI embedding API.")

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: embedding.length,
      expectedDimensions: EMBEDDING_DIMENSIONS,
      embeddingSample: embedding.slice(0, 5),
      dimensionMatch: embedding.length === EMBEDDING_DIMENSIONS,
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}

async function testKV() {
  try {
    const startTime = Date.now()

    // Test KV operations
    const testKey = `debug-test-${Date.now()}`
    const testValue = { timestamp: Date.now(), random: Math.random() }

    // Test set
    await kv.set(testKey, testValue, { ex: 60 }) // Expire in 60 seconds

    // Test get
    const retrievedValue = await kv.get(testKey)

    // Test delete
    await kv.del(testKey)

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      operations: {
        set: { status: "success" },
        get: {
          status: "success",
          valueMatch: JSON.stringify(retrievedValue) === JSON.stringify(testValue),
        },
        delete: { status: "success" },
      },
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}
