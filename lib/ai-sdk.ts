/**
 * AI SDK Configuration
 *
 * Purpose: Centralized configuration for OpenAI models used throughout the application
 *
 * This file configures:
 * - Text embedding model (text-embedding-3-large with 3072 dimensions)
 * - Chat completion model (GPT-4 Turbo)
 *
 * Usage:
 * - Import embedding model for document processing and search
 * - Import chat model for RAG responses
 *
 * Note: Requires OPENAI_API_KEY environment variable
 *
 * @module lib/ai-sdk
 */

import { openai } from "@ai-sdk/openai"

// Configure embedding model
// Using text-embedding-3-large for better semantic understanding
// This model outputs 3072-dimensional vectors
export const embedding = openai.embedding("text-embedding-3-large")

// Configure chat model
// Using GPT-4 Turbo for better reasoning and context understanding
export const chatModel = openai.chat("gpt-4-turbo")

// Model constants for validation
export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 3072
export const CHAT_MODEL = "gpt-4-turbo"

// Type definitions for better TypeScript support
export type EmbeddingModel = typeof embedding
export type ChatModel = typeof chatModel

// Configuration validation
export function validateAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required")
  }
}

// Helper function to get model info
export function getModelInfo() {
  return {
    embedding: {
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    },
    chat: {
      model: CHAT_MODEL,
    },
  }
}
