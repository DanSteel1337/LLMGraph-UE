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
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../lib/supabase-server"

export const runtime = "edge"

async function testPinecone() {
  const startTime = Date.now()

  try {
    // Check if required environment variables are set
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.PINECONE_HOST) {
      return {
        status: "error",
        message: "Missing required Pinecone environment variables",
        latency: Date.now() - startTime,
        missingVars: [
          !process.env.PINECONE_API_KEY ? "PINECONE_API_KEY" : null,
          !process.env.PINECONE_INDEX_NAME ? "PINECONE_INDEX_NAME" : null,
          !process.env.PINECONE_HOST ? "PINECONE_HOST" : null,
        ].filter(Boolean),
      }
    }

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
      stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      latency: Date.now() - startTime,
    }
  }
}

async function testOpenAI() {
  const startTime = Date.now()

  try {
    // Check if required environment variables are set
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: "error",
        message: "Missing required OpenAI environment variables",
        latency: Date.now() - startTime,
        missingVars: ["OPENAI_API_KEY"],
      }
    }

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
      stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      latency: Date.now() - startTime,
    }
  }
}

async function testKV() {
  const startTime = Date.now()

  try {
    // Check if required environment variables are set
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return {
        status: "error",
        message: "Missing required KV environment variables",
        latency: Date.now() - startTime,
        missingVars: [
          !process.env.KV_REST_API_URL ? "KV_REST_API_URL" : null,
          !process.env.KV_REST_API_TOKEN ? "KV_REST_API_TOKEN" : null,
        ].filter(Boolean),
      }
    }

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
      stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      latency: Date.now() - startTime,
    }
  }
}

async function testSupabase() {
  const startTime = Date.now()

  try {
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: "error",
        message: "Missing required Supabase environment variables",
        latency: Date.now() - startTime,
        missingVars: [
          !process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : null,
          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
        ].filter(Boolean),
      }
    }

    // Test Supabase connection
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      sessionExists: !!data.session,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^(https?:\/\/)/, ""),
      anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  } catch (e: any) {
    console.error("Supabase test error:", e)
    return {
      status: "error",
      message: e.message || "An error occurred",
      stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      latency: Date.now() - startTime,
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
    supabase: await testSupabase(),
  }

  return NextResponse.json({
    timestamp,
    environment,
    runtime: "edge",
    tests,
  })
}
