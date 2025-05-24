/**
 * Blob Fetch Utilities for Edge Runtime
 *
 * Purpose: Provides safe blob content fetching that works in Edge Runtime
 * Logic:
 * - Validates blob exists using head() before fetch()
 * - Prevents "Cannot read properties of undefined" errors
 * - Handles Edge Runtime fetch limitations
 * Runtime context: Edge Function
 * Services: Vercel Blob
 */

import { head } from "@vercel/blob"

/**
 * Safely fetch content from Vercel Blob in Edge Runtime
 * Validates blob exists before fetching to prevent toString errors
 *
 * @param url - The Vercel Blob URL to fetch content from
 * @returns Promise<string> - The blob content as text
 * @throws Error if blob doesn't exist or fetch fails
 */
export async function fetchBlobContent(url: string): Promise<string> {
  if (!url) {
    throw new Error("Blob URL is required")
  }

  try {
    // Step 1: Validate blob exists using head() method
    // This is crucial for Edge Runtime compatibility
    const metadata = await head(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!metadata) {
      throw new Error("Blob metadata not found")
    }

    // Step 2: Fetch using the validated URL from metadata
    // Use metadata.url to ensure we have the correct URL format
    const response = await fetch(metadata.url, {
      method: "GET",
      // Remove custom headers - not needed for public blobs
      // Edge Runtime handles standard headers automatically
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Step 3: Get content as text
    const content = await response.text()

    if (!content) {
      throw new Error("Blob content is empty")
    }

    return content
  } catch (error) {
    // Handle specific blob errors
    if (error.name === "BlobNotFoundError") {
      throw new Error("Document not found in storage. It may have been deleted.")
    }

    if (error.name === "BlobAccessDeniedError") {
      throw new Error("Access denied to document. Check permissions.")
    }

    // Re-throw with context
    throw new Error(`Failed to fetch blob content: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Validate that a blob exists without fetching its content
 * Useful for checking blob existence before processing
 *
 * @param url - The Vercel Blob URL to validate
 * @returns Promise<boolean> - True if blob exists, false otherwise
 */
export async function validateBlobExists(url: string): Promise<boolean> {
  if (!url) {
    return false
  }

  try {
    const metadata = await head(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return !!metadata
  } catch (error) {
    // If head() throws, blob doesn't exist or is inaccessible
    return false
  }
}

/**
 * Get blob metadata without fetching content
 * Useful for getting file size, content type, etc.
 *
 * @param url - The Vercel Blob URL to get metadata for
 * @returns Promise<BlobMetadata> - The blob metadata
 */
export async function getBlobMetadata(url: string) {
  if (!url) {
    throw new Error("Blob URL is required")
  }

  try {
    const metadata = await head(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!metadata) {
      throw new Error("Blob not found")
    }

    return {
      size: metadata.size,
      contentType: metadata.contentType,
      uploadedAt: metadata.uploadedAt,
      url: metadata.url,
    }
  } catch (error) {
    if (error.name === "BlobNotFoundError") {
      throw new Error("Document not found in storage")
    }

    throw new Error(`Failed to get blob metadata: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
