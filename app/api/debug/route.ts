/**
 * Enhanced Debug API Route with Source Map Support
 *
 * Purpose: Comprehensive system diagnostics with error tracking and source map integration
 *
 * Features:
 * - Tests all system components (Pinecone, Supabase, KV, OpenAI)
 * - Performs real operations to verify functionality
 * - Enhanced error tracking with source maps
 * - Request ID tracking for debugging
 * - Structured logging for analysis
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 */

import { type NextRequest, NextResponse } from "next/server"
import { validateEnv, parseError, formatErrorForLogging, generateRequestId, retry } from "@/lib/utils"
import { createClient } from "@/lib/pinecone/client"
import { createEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/ai/embeddings"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    console.log(
      "Debug diagnostics started:",
      JSON.stringify(
        {
          requestId,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      throw new Error("Unauthorized: Authentication required for debug access")
    }

    // Validate environment variables
    validateEnv(["SUPABASE", "OPENAI", "PINECONE", "VERCEL_KV"])

    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      runtime: "edge",
      tests: {} as Record<string, any>,
      metadata: {
        requestId,
        userId: data.user.id,
      },
    }

    // Test Pinecone Vector Database
    console.log("Testing Pinecone...", { requestId })
    const pineconeStartTime = Date.now()
    try {
      // Use our custom REST client instead of the official SDK
      const pineconeClient = createClient(requestId)

      // Test 1: Get index stats
      const stats = await retry(() => pineconeClient.describeIndexStats(), {
        retries: 2,
        requestId,
        context: { operation: "debug-pinecone-stats" },
      })

      // Test 2: Generate a real embedding
      const testEmbedding = await retry(
        () => createEmbedding("This is a test query for debugging the Pinecone vector database."),
        {
          retries: 2,
          requestId,
          context: { operation: "debug-embedding-generation" },
        },
      )

      // Validate embedding dimensions
      if (testEmbedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${testEmbedding.length}. Model: ${EMBEDDING_MODEL}`,
        )
      }

      // Test 3: Create a test vector
      const testVector = {
        id: `debug-test-${Date.now()}`,
        values: testEmbedding,
        metadata: {
          text: "This is a test vector for debugging the Pinecone vector database.",
          source: "debug-test",
          timestamp: new Date().toISOString(),
          requestId,
        },
      }

      // Test 4: Upsert the test vector
      const upsertResult = await retry(() => pineconeClient.upsert([testVector]), {
        retries: 2,
        requestId,
        context: { operation: "debug-pinecone-upsert" },
      })

      // Test 5: Query the test vector
      const queryResult = await retry(
        () =>
          pineconeClient.query({
            vector: testEmbedding,
            topK: 1,
            includeMetadata: true,
            filter: { source: "debug-test" },
          }),
        {
          retries: 2,
          requestId,
          context: { operation: "debug-pinecone-query" },
        },
      )

      // Test 6: Delete the test vector
      const deleteResult = await retry(() => pineconeClient.delete({ ids: [testVector.id] }), {
        retries: 2,
        requestId,
        context: { operation: "debug-pinecone-delete" },
      })

      const pineconeLatency = Date.now() - pineconeStartTime

      results.tests.pinecone = {
        status: "success",
        latency: pineconeLatency,
        embeddingModel: EMBEDDING_MODEL,
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        stats,
        operations: {
          embedding: {
            status: "success",
            dimensions: testEmbedding.length,
          },
          upsert: {
            status: "success",
            result: upsertResult,
          },
          query: {
            status: "success",
            result: queryResult,
          },
          delete: {
            status: "success",
            result: deleteResult,
          },
        },
      }

      console.log(
        "Pinecone test completed:",
        JSON.stringify(
          {
            requestId,
            status: "success",
            latency: `${pineconeLatency}ms`,
            operations: Object.keys(results.tests.pinecone.operations),
          },
          null,
          2,
        ),
      )
    } catch (error) {
      const pineconeLatency = Date.now() - pineconeStartTime
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "debug-pinecone-test",
        service: "pinecone",
        latency: `${pineconeLatency}ms`,
      })

      console.error("Pinecone test failed:", JSON.stringify(logEntry, null, 2))

      results.tests.pinecone = {
        status: "error",
        latency: pineconeLatency,
        error: parsedError.message,
        details: parsedError,
        config: {
          host: process.env.PINECONE_HOST,
          indexName: process.env.PINECONE_INDEX_NAME,
          apiKeySet: !!process.env.PINECONE_API_KEY,
        },
      }
    }

    // Test Vercel KV
    console.log("Testing Vercel KV...", { requestId })
    const kvStartTime = Date.now()
    try {
      const testKey = `debug-test-${requestId}`
      const testValue = { message: "debug test", timestamp: new Date().toISOString(), requestId }

      await retry(() => kv.set(testKey, testValue, { ex: 60 }), {
        retries: 2,
        requestId,
        context: { operation: "debug-kv-set" },
      })

      const retrievedValue = await retry(() => kv.get(testKey), {
        retries: 2,
        requestId,
        context: { operation: "debug-kv-get" },
      })

      await retry(() => kv.del(testKey), {
        retries: 2,
        requestId,
        context: { operation: "debug-kv-delete" },
      })

      const kvLatency = Date.now() - kvStartTime

      results.tests.kv = {
        status: "success",
        latency: kvLatency,
        operations: {
          set: "success",
          get: "success",
          delete: "success",
        },
        testData: {
          stored: testValue,
          retrieved: retrievedValue,
          match: JSON.stringify(testValue) === JSON.stringify(retrievedValue),
        },
      }

      console.log(
        "KV test completed:",
        JSON.stringify(
          {
            requestId,
            status: "success",
            latency: `${kvLatency}ms`,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      const kvLatency = Date.now() - kvStartTime
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "debug-kv-test",
        service: "vercel-kv",
        latency: `${kvLatency}ms`,
      })

      console.error("KV test failed:", JSON.stringify(logEntry, null, 2))

      results.tests.kv = {
        status: "error",
        latency: kvLatency,
        error: parsedError.message,
        details: parsedError,
      }
    }

    // Test OpenAI Embeddings
    console.log("Testing OpenAI embeddings...", { requestId })
    const openaiStartTime = Date.now()
    try {
      const testText = "This is a test query for debugging OpenAI embeddings API."

      const embedding = await retry(() => createEmbedding(testText), {
        retries: 2,
        requestId,
        context: { operation: "debug-openai-embedding" },
      })

      // Validate embedding
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Invalid embedding: expected array of ${EMBEDDING_DIMENSIONS} numbers, got ${typeof embedding} with length ${embedding?.length}`,
        )
      }

      const openaiLatency = Date.now() - openaiStartTime

      results.tests.openai = {
        status: "success",
        latency: openaiLatency,
        model: EMBEDDING_MODEL,
        dimensions: embedding.length,
        testText,
        embeddingPreview: embedding.slice(0, 5), // First 5 values for preview
      }

      console.log(
        "OpenAI test completed:",
        JSON.stringify(
          {
            requestId,
            status: "success",
            latency: `${openaiLatency}ms`,
            model: EMBEDDING_MODEL,
            dimensions: embedding.length,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      const openaiLatency = Date.now() - openaiStartTime
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "debug-openai-test",
        service: "openai",
        latency: `${openaiLatency}ms`,
      })

      console.error("OpenAI test failed:", JSON.stringify(logEntry, null, 2))

      results.tests.openai = {
        status: "error",
        latency: openaiLatency,
        error: parsedError.message,
        details: parsedError,
      }
    }

    // Test Supabase Authentication
    console.log("Testing Supabase auth...", { requestId })
    const supabaseStartTime = Date.now()
    try {
      // Test user session (already validated above)
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const supabaseLatency = Date.now() - supabaseStartTime

      results.tests.supabase = {
        status: "success",
        latency: supabaseLatency,
        user: {
          id: userData.user?.id,
          email: userData.user?.email,
          authenticated: !!userData.user,
        },
      }

      console.log(
        "Supabase test completed:",
        JSON.stringify(
          {
            requestId,
            status: "success",
            latency: `${supabaseLatency}ms`,
            authenticated: !!userData.user,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      const supabaseLatency = Date.now() - supabaseStartTime
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "debug-supabase-test",
        service: "supabase",
        latency: `${supabaseLatency}ms`,
      })

      console.error("Supabase test failed:", JSON.stringify(logEntry, null, 2))

      results.tests.supabase = {
        status: "error",
        latency: supabaseLatency,
        error: parsedError.message,
        details: parsedError,
      }
    }

    // Calculate total duration and add to metadata
    const totalDuration = Date.now() - startTime
    results.metadata.duration = `${totalDuration}ms`

    // Log final results summary
    const testStatuses = Object.fromEntries(Object.entries(results.tests).map(([key, value]) => [key, value.status]))

    console.log(
      "Debug diagnostics completed:",
      JSON.stringify(
        {
          requestId,
          testStatuses,
          totalDuration: `${totalDuration}ms`,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    return NextResponse.json(results, {
      headers: {
        "x-request-id": requestId,
      },
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      timestamp: new Date().toISOString(),
    })

    const logEntry = formatErrorForLogging(parsedError, {
      requestId,
      timestamp: new Date().toISOString(),
      operation: "debug-diagnostics-overall",
      totalDuration: `${totalDuration}ms`,
    })

    console.error("Debug diagnostics failed:", JSON.stringify(logEntry, null, 2))

    return NextResponse.json(
      {
        error: "Debug diagnostics failed",
        message: parsedError.message,
        requestId,
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === "development" ? parsedError : undefined,
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
