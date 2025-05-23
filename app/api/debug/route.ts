import { Pinecone } from "@pinecone-database/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"
import { NextResponse } from "next/server"

const EMBEDDING_DIMENSIONS = 1536

async function testPinecone() {
  const startTime = Date.now()
  // Sanitize the host value
  const host = sanitizeHost(process.env.PINECONE_HOST || "")

  // Log environment variables for debugging (will be removed in production)
  console.log("Debug - Pinecone Environment Variables:", {
    apiKey: process.env.PINECONE_API_KEY ? "Set (redacted)" : "Not set",
    indexName: process.env.PINECONE_INDEX_NAME,
    host: host, // Use sanitized host
    expectedDimensions: EMBEDDING_DIMENSIONS,
  })

  try {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.PINECONE_HOST) {
      console.warn("Pinecone environment variables not set")
      return {
        status: "error",
        message: "Pinecone environment variables not set",
      }
    }

    // Create a new client instance specifically for debugging
    // This ensures we're using the latest environment variables
    const pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_HOST!,
    })

    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME)

    const statsResult = await index.describeIndexStats()

    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-large",
      dimensions: EMBEDDING_DIMENSIONS,
    })

    const testEmbedding = await embeddings.embedQuery("test query")

    const upsertResult = await index.upsert([
      {
        id: "test-vector",
        values: testEmbedding,
        metadata: { type: "test" },
      },
    ])

    const queryResult = await index.query({
      vector: testEmbedding,
      topK: 1,
    })

    const deleteResult = await index.delete1({ ids: ["test-vector"] })

    const endTime = Date.now()

    return {
      status: "success",
      latency: endTime - startTime,
      embeddingModel: "text-embedding-3-large",
      embeddingDimensions: EMBEDDING_DIMENSIONS,
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
        query: { status: "success", result: queryResult },
        delete: { status: "success", result: deleteResult },
      },
    }
  } catch (e: any) {
    console.error(e)
    return {
      status: "error",
      message: e.message || "An error occurred",
    }
  }
}

function sanitizeHost(host: string): string {
  // Remove any characters that are not alphanumeric, dots, or hyphens
  let cleanHost = host.replace(/[^a-zA-Z0-9.-]/g, "")

  // Ensure the host does not start or end with a hyphen
  cleanHost = cleanHost.replace(/^-+|-+$/g, "")

  return cleanHost
}

export async function GET() {
  const pineconeTestResult = await testPinecone()
  return NextResponse.json(pineconeTestResult)
}
