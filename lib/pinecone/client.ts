/**
 * Purpose: Pinecone client singleton
 * Logic:
 * - Creates and configures Pinecone client
 * - Implements singleton pattern
 * - Uses Edge-compatible REST client
 * Runtime context: Edge Function
 */
import { PineconeRestClient } from "./rest-client"

let pineconeClient: PineconeRestClient | null = null

function sanitizeHost(host: string): string {
  // Remove any protocol prefix (http:// or https://)
  return host.replace(/^(https?:\/\/)/, "")
}

export function createClient(): PineconeRestClient {
  // Validate environment variables
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("Missing required environment variable: PINECONE_API_KEY")
  }

  if (!process.env.PINECONE_INDEX_NAME) {
    throw new Error("Missing required environment variable: PINECONE_INDEX_NAME")
  }

  if (!process.env.PINECONE_HOST) {
    throw new Error("Missing required environment variable: PINECONE_HOST")
  }

  if (!pineconeClient) {
    const host = sanitizeHost(process.env.PINECONE_HOST)

    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Creating Pinecone client with:", {
        indexName: process.env.PINECONE_INDEX_NAME,
        host: host,
        apiKeySet: !!process.env.PINECONE_API_KEY,
      })
    }

    pineconeClient = new PineconeRestClient({
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME,
      host: host,
    })
  }

  return pineconeClient
}
