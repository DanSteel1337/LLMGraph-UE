/**
 * Purpose: Pinecone client singleton
 * Logic:
 * - Creates and configures Pinecone client
 * - Implements singleton pattern
 * Runtime context: Edge Function
 * Services: Pinecone
 */
import { Pinecone } from "@pinecone-database/pinecone"
import { validateEnv } from "../utils/env"

let pineconeClient: Pinecone | null = null

export function createClient(): Pinecone {
  validateEnv()

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    })
  }

  return pineconeClient
}
