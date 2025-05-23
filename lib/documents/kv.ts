/**
 * KV Storage Wrapper
 *
 * Purpose: Provides a consistent interface to Vercel KV
 * Logic:
 * - Re-exports Vercel KV client
 * - Adds document-specific helper methods
 * Runtime context: Edge Function
 * Services: Vercel KV
 */

import { vercelKV } from "@vercel/kv"

// Re-export the KV client
export const kv = vercelKV

// Document-specific KV helpers
export const documentKeys = {
  // Key patterns for document data
  document: (id: string) => `document:${id}`,
  status: (id: string) => `document:${id}:status`,
  chunks: (id: string) => `document:${id}:chunks`,
  vectors: (id: string) => `document:${id}:vectors`,

  // Key patterns for processing metrics
  processingMetrics: "document-processing:metrics",

  // TTL values in seconds
  ttl: {
    document: 86400 * 30, // 30 days
    status: 86400, // 1 day
    metrics: 86400 * 7, // 7 days
  },
}

// Helper to update document processing metrics
export async function updateProcessingMetrics(metrics: {
  activeProcessingJobs?: number
  recentlyCompletedJobs?: number
  recentErrors?: number
  averageProcessingTime?: number
}) {
  try {
    // Get current metrics
    const currentMetrics = (await kv.get(documentKeys.processingMetrics)) || {
      activeProcessingJobs: 0,
      recentlyCompletedJobs: 0,
      recentErrors: 0,
      averageProcessingTime: null,
    }

    // Update with new values
    const updatedMetrics = {
      ...currentMetrics,
      ...metrics,
    }

    // Store updated metrics with TTL
    await kv.set(documentKeys.processingMetrics, updatedMetrics, { ex: documentKeys.ttl.metrics })

    return updatedMetrics
  } catch (error) {
    console.error("Error updating processing metrics:", error)
    return null
  }
}
