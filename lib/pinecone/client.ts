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
import { validateEnv } from "../utils/env"
import { parseError, formatErrorForLogging, generateRequestId, withErrorBoundary } from "../utils/edge-error-parser"
import { retryWithExponentialBackoff } from "../utils/retry"

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

let pineconeClient: EnhancedPineconeClient | null = null

// Enhanced client with error tracking
class EnhancedPineconeClient {
  private client: PineconeRestClient
  private requestId: string

  constructor(client: PineconeRestClient, requestId: string) {
    this.client = client
    this.requestId = requestId
  }

  async query(params: any) {
    return withErrorBoundary(
      async () => {
        return await retryWithExponentialBackoff(() => this.client.query(params), {
          maxRetries: 3,
          initialDelay: 300,
          maxDelay: 3000,
        })
      },
      {
        requestId: this.requestId,
        service: "pinecone",
        operation: "query",
        context: {
          namespace: params.namespace,
          topK: params.topK,
          includeMetadata: params.includeMetadata,
        },
      },
    )()
  }

  async upsert(params: any) {
    return withErrorBoundary(
      async () => {
        return await retryWithExponentialBackoff(() => this.client.upsert(params), {
          maxRetries: 3,
          initialDelay: 300,
          maxDelay: 3000,
        })
      },
      {
        requestId: this.requestId,
        service: "pinecone",
        operation: "upsert",
        context: {
          namespace: params.namespace,
          vectorCount: params.vectors?.length,
        },
      },
    )()
  }

  async delete(params: any) {
    return withErrorBoundary(
      async () => {
        return await retryWithExponentialBackoff(() => this.client.delete(params), {
          maxRetries: 3,
          initialDelay: 300,
          maxDelay: 3000,
        })
      },
      {
        requestId: this.requestId,
        service: "pinecone",
        operation: "delete",
        context: {
          namespace: params.namespace,
          deleteAll: params.deleteAll,
          ids: params.ids?.length,
          filter: !!params.filter,
        },
      },
    )()
  }

  async describeIndexStats() {
    return withErrorBoundary(
      async () => {
        return await retryWithExponentialBackoff(() => this.client.describeIndexStats(), {
          maxRetries: 3,
          initialDelay: 300,
          maxDelay: 3000,
        })
      },
      {
        requestId: this.requestId,
        service: "pinecone",
        operation: "describeIndexStats",
      },
    )()
  }
}

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host.replace(/^(https?:\/\/)/, "")
}

export function createClient(requestId?: string): EnhancedPineconeClient {
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
      const baseClient = new PineconeRestClient({
        apiKey: process.env.PINECONE_API_KEY!,
        indexName: process.env.PINECONE_INDEX_NAME!,
        host: host,
      })

      pineconeClient = new EnhancedPineconeClient(baseClient, currentRequestId)
    }

    return pineconeClient
  } catch (error) {
    // Enhanced error logging for Pinecone client creation
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
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

    const logEntry = formatErrorForLogging(parsedError)

    console.error("Pinecone client creation failed:", JSON.stringify(logEntry, null, 2))
    throw error
  }
}
