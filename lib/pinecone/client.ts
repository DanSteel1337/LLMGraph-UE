/**
 * Purpose: Pinecone client singleton
 * Logic:
 * - Creates and configures Pinecone client
 * - Implements singleton pattern
 * - Uses Edge-compatible REST client
 * Runtime context: Edge Function
 */
import { PineconeRestClient } from "./rest-client"
import { validateEnv } from "../utils/env"

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

export function createClient(): PineconeRestClient {
  validateEnv(["PINECONE"])

  // Log Pinecone configuration (without exposing the API key)
  const host = sanitizeHost(process.env.PINECONE_HOST!)

  console.log("Creating Pinecone client with:", {
    indexName: process.env.PINECONE_INDEX_NAME,
    host: host,
    apiKeySet: !!process.env.PINECONE_API_KEY,
  })

  if (!pineconeClient) {
    pineconeClient = new PineconeRestClient({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME!,
      host: host,
    })
  }

  return pineconeClient
}
