/**
 * Pinecone REST Client Types
 *
 * Purpose: Type definitions for the Pinecone REST client
 * Logic:
 * - Defines interfaces for Pinecone API requests and responses
 * - Ensures type safety when using the REST client
 * Runtime context: Edge Function
 */

export interface PineconeVector {
  id: string
  values: number[]
  metadata?: Record<string, any>
}

export interface PineconeQueryRequest {
  vector: number[]
  topK: number
  includeMetadata?: boolean
  includeValues?: boolean
  filter?: Record<string, any>
  namespace?: string
}

export interface PineconeQueryResponse {
  matches: Array<{
    id: string
    score: number
    metadata?: Record<string, any>
    values?: number[]
  }>
  namespace?: string
}

export interface PineconeUpsertRequest {
  vectors: PineconeVector[]
  namespace?: string
}

export interface PineconeUpsertResponse {
  upsertedCount: number
}

export interface PineconeDeleteRequest {
  ids?: string[]
  filter?: Record<string, any>
  namespace?: string
}

export interface PineconeDeleteResponse {
  deletedCount: number
}

export interface PineconeIndexStats {
  namespaces: Record<
    string,
    {
      vectorCount: number
    }
  >
  dimension: number
  indexFullness: number
  totalVectorCount: number
}

export interface PineconeConfig {
  apiKey: string
  indexName: string
}
