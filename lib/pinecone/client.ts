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

export function createClient(): PineconeRestClient {
  validateEnv()

  if (!pineconeClient) {
    pineconeClient = new PineconeRestClient({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME!,
      host: process.env.PINECONE_HOST!,
    })
  }

  return pineconeClient
}
