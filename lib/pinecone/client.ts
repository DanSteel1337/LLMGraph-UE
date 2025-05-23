/**
 * Purpose: Pinecone client singleton with enhanced error tracking
 * Logic:
 * - Creates and configures Pinecone client
 * - Implements singleton pattern
 * - Uses Edge-compatible REST client
 * - Enhanced error tracking and logging
 * Runtime context: Edge Function
 */
import { PineconeRestClient } from "./rest-client"
import { validateEnv, parseError, formatErrorForLogging, generateRequestId } from "../utils"
import { withErrorTracking } from "../middleware/error-tracking"

// Re-export types
export type {
  PineconeConfig,
  PineconeVector,
  PineconeQueryRequest,
  PineconeQueryResponse,
  PineconeUpsertRequest,
  PineconeUpsertResponse,
  PineconeDeleteRequest,
  PineconeDeleteResponse,
  PineconeIndexStats,
} from "./rest-client"

let pineconeClient: PineconeRestClient | null = null

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host.replace(/^(https?:\/\/)/, "")
}

export function createClient(requestId?: string): PineconeRestClient {
  const currentRequestId = requestId || generateRequestId()

  try {
    validateEnv(["PINECONE"])

    // Log Pinecone configuration (without exposing the API key)
    const host = sanitizeHost(process.env.PINECONE_HOST!)

    console.log(
      "Creating Pinecone client:",
      JSON.stringify(
        {
          requestId: currentRequestId,
          indexName: process.env.PINECONE_INDEX_NAME,
          host: host,
          apiKeySet: !!process.env.PINECONE_API_KEY,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    if (!pineconeClient) {
      const client = new PineconeRestClient({
        apiKey: process.env.PINECONE_API_KEY!,
        indexName: process.env.PINECONE_INDEX_NAME!,
        host: host,
      })

      // Wrap client methods with error tracking
      const originalQuery = client.query.bind(client)
      client.query = withErrorTracking(originalQuery, {
        requestId: currentRequestId,
        service: "pinecone",
        operation: "query",
      })

      const originalUpsert = client.upsert.bind(client)
      client.upsert = withErrorTracking(originalUpsert, {
        requestId: currentRequestId,
        service: "pinecone",
        operation: "upsert",
      })

      const originalDelete = client.delete.bind(client)
      client.delete = withErrorTracking(originalDelete, {
        requestId: currentRequestId,
        service: "pinecone",
        operation: "delete",
      })

      pineconeClient = client
    }

    return pineconeClient
  } catch (error) {
    // Enhanced error logging for Pinecone client creation
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
      requestId: currentRequestId,
      timestamp: new Date().toISOString(),
    })

    const logEntry = formatErrorForLogging(parsedError, {
      requestId: currentRequestId,
      timestamp: new Date().toISOString(),
      service: "pinecone",
      operation: "client-creation",
      context: {
        hostSet: !!process.env.PINECONE_HOST,
        indexNameSet: !!process.env.PINECONE_INDEX_NAME,
        apiKeySet: !!process.env.PINECONE_API_KEY,
      },
    })

    console.error("Pinecone client creation failed:", JSON.stringify(logEntry, null, 2))
    throw error
  }
}
