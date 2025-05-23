/**
 * Debug API Route
 *
 * Purpose: Provides diagnostic information for system components
 *
 * Features:
 * - Tests Pinecone connectivity using the custom REST client
 * - Validates embedding generation
 * - Performs test operations (upsert, query, delete)
 * - Returns detailed diagnostic information
 *
 * Runtime: Vercel Edge Runtime
 */

import { NextResponse } from "next/server"
import { createClient } from "../../../lib/pinecone/client"
import { createEmbedding } from "../../../lib/ai/embeddings"
import { validateEnv } from "../../../lib/utils/env"
import { kv } from "@vercel/kv"

export const runtime = "edge"

async function testPinecone() {
  const startTime = Date.now()

  try {
    validateEnv(["PINECONE"])

    // Get the custom REST client
    const pineconeClient = createClient()

    // Test index stats
    const statsResult = await pineconeClient.describeIndexStats()

    // Generate a test embedding using our custom function
    const testEmbedding = await createEmbedding("test query for diagnostic purposes")

    // Test vector operations
    const testId = `test-vector-${Date.now()}`

    // Test upsert
    const upsertResult = await pineconeClient.upsert([
      {
        id: testId,
        values: testEmbedding,
        metadata: {
          type: "test",
          text: "test vector for diagnostic purposes",
          timestamp: new Date().toISOString(),
        },
      },
    ])

    // Test query
    const queryResult = await pineconeClient.query({
      vector: testEmbedding,
      topK: 1,
      includeMetadata: true,
    })

    // Test delete
    const deleteResult = await pineconeClient.delete({
      ids: [testId],
    })

    const endTime = Date.now()

    // Sanitize host for security
    const host = process.env.PINECONE_HOST?.replace(/^(https?:\/\/)/, "") || "not-set"

    return {
      status: "success",
      latency: endTime - startTime,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: testEmbedding.length,
      config: {
        host: host,
        indexName: process.env.PINECONE_INDEX_NAME,
        apiKeySet: !!process.env.PINECONE_API_KEY,
      },
      stats: {
        totalVectors: statsResult.totalVectorCount,
        dimension: statsResult.dimension,
        namespaces: Object.keys(statsResult.namespaces || {}),
      },
      operations: {
        embedding: { status: "success", dimensions: testEmbedding.length },
        upsert: { status: "success", result: upsertResult },
        query: { status: "success", matches: queryResult.matches?.length || 0 },
        delete: { status: "success", result: deleteResult },
      },
    }
  } catch (e: any) {
    console.error("Pinecone test error:", e)
    return {
      status: "error",
      message: e.message || "An error occurred",
      stack: e.stack,
    }
  }
}

async function testOpenAI() {
  const startTime = Date.now()

  try {
    validateEnv(["OPENAI"])

    // Test embedding generation
    const embedding = await createEmbedding("This is a test query for OpenAI diagnostics")

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      model: "text-embedding-3-large",
      dimensions: embedding.length,
      apiKeySet: !!process.env.OPENAI_API_KEY,
    }
  } catch (e: any) {
    console.error("OpenAI test error:", e)
    return {
      status: "error",
      message: e.message || "An error occurred",
      stack: e.stack,
    }
  }
}

async function testKV() {
  const startTime = Date.now()

  try {
    validateEnv(["VERCEL_KV"])

    // Test KV operations
    const testKey = `debug-test-${Date.now()}`
    const testValue = { timestamp: Date.now(), test: true }

    // Set
    await kv.set(testKey, testValue, { ex: 60 }) // 60 second expiry

    // Get
    const retrievedValue = await kv.get(testKey)

    // Delete
    await kv.del(testKey)

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      operations: {
        set: { status: "success" },
        get: {
          status: "success",
          match: JSON.stringify(retrievedValue) === JSON.stringify(testValue),
        },
        delete: { status: "success" },
      },
    }
  } catch (e: any) {
    console.error("KV test error:", e)
    return {
      status: "error",
      message: e.message || "An error occurred",
      stack: e.stack,
    }
  }
}

export async function GET() {
  const timestamp = new Date().toISOString()
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

  const tests = {
    pinecone: await testPinecone(),
    openai: await testOpenAI(),
    kv: await testKV(),
  }

  return NextResponse.json({
    timestamp,
    environment,
    runtime: "edge",
    tests,
  })
}
