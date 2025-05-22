/**
 * Pinecone REST Client for Edge Runtime
 *
 * A lightweight, fetch-based implementation of Pinecone operations
 * that works in Edge Runtime without Node.js dependencies.
 */

import { retryPineconeOperation } from "../utils/retry"
import type {
  PineconeConfig,
  PineconeVector,
  PineconeQueryRequest,
  PineconeQueryResponse,
  PineconeUpsertRequest,
  PineconeUpsertResponse,
  PineconeDeleteRequest,
  PineconeDeleteResponse,
  PineconeIndexStats,
} from "./types"

export class PineconeRestClient {
  private apiKey: string
  private indexName: string
  private baseUrl: string

  constructor(config: PineconeConfig) {
    this.apiKey = config.apiKey
    this.indexName = config.indexName
    this.baseUrl = `https://${config.host}`
  }

  /**
   * Query vectors by similarity
   */
  async query(request: PineconeQueryRequest): Promise<PineconeQueryResponse> {
    return retryPineconeOperation(async () => {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          "Api-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinecone query failed: ${response.status} - ${errorText}`)
      }

      return await response.json()
    })
  }

  /**
   * Upsert vectors to the index
   */
  async upsert(vectors: PineconeVector[], namespace?: string): Promise<PineconeUpsertResponse> {
    return retryPineconeOperation(async () => {
      const request: PineconeUpsertRequest = {
        vectors,
        namespace,
      }

      const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
        method: "POST",
        headers: {
          "Api-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinecone upsert failed: ${response.status} - ${errorText}`)
      }

      return await response.json()
    })
  }

  /**
   * Delete vectors by ID or filter
   */
  async delete(options: PineconeDeleteRequest): Promise<PineconeDeleteResponse> {
    return retryPineconeOperation(async () => {
      const response = await fetch(`${this.baseUrl}/vectors/delete`, {
        method: "POST",
        headers: {
          "Api-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinecone delete failed: ${response.status} - ${errorText}`)
      }

      return await response.json()
    })
  }

  /**
   * List indexes (simulated for compatibility)
   */
  async listIndexes(): Promise<{ indexes: Array<{ name: string }> }> {
    // This is a simplified implementation since we're using a single index
    return {
      indexes: [{ name: this.indexName }],
    }
  }

  /**
   * Get index stats
   */
  async describeIndexStats(namespace?: string): Promise<PineconeIndexStats> {
    return retryPineconeOperation(async () => {
      const body = namespace ? { namespace } : {}

      try {
        const response = await fetch(`${this.baseUrl}/describe_index_stats`, {
          method: "POST",
          headers: {
            "Api-Key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const errorMessage = `Pinecone describe_index_stats failed: ${response.status} - ${errorText}`

          // Log detailed error information
          console.error("Pinecone API Error:", {
            status: response.status,
            url: `${this.baseUrl}/describe_index_stats`,
            error: errorText,
            indexName: this.indexName,
            // Don't log the API key
          })

          throw new Error(errorMessage)
        }

        return await response.json()
      } catch (error) {
        // Enhance error with more context
        if (error instanceof Error) {
          error.message = `Pinecone API Error (${this.indexName}@${this.baseUrl}): ${error.message}`
        }
        throw error
      }
    })
  }
}

// Re-export types for convenience
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
} from "./types"
