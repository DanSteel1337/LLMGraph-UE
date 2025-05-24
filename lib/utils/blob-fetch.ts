/**
 * Blob Fetch Utilities for Edge Runtime
 *
 * Purpose: Provides safe blob content fetching that works in Edge Runtime
 * Logic:
 * - Validates blob exists using head() before fetch()
 * - Handles both public and private blob access patterns
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

  console.log("[BLOB FETCH] Starting blob content fetch for URL:", url)

  try {
    // Step 1: Validate blob exists using head() method
    // For public blobs, we don't need a token
    console.log("[BLOB FETCH] Validating blob exists using head() method")

    let metadata
    try {
      // Try without token first (for public blobs)
      metadata = await head(url)
      console.log("[BLOB FETCH] Public blob validation successful:", {
        size: metadata.size,
        contentType: metadata.contentType,
        pathname: metadata.pathname,
      })
    } catch (publicError) {
      console.log("[BLOB FETCH] Public access failed, trying with token:", publicError.message)

      // If public access fails, try with token
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          metadata = await head(url, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          })
          console.log("[BLOB FETCH] Private blob validation successful with token")
        } catch (tokenError) {
          console.error("[BLOB FETCH] Both public and token validation failed:", {
            publicError: publicError.message,
            tokenError: tokenError.message,
          })
          throw new Error(`Blob validation failed: ${tokenError.message}`)
        }
      } else {
        console.error("[BLOB FETCH] No token available for private blob access")
        throw new Error(`Blob validation failed: ${publicError.message}`)
      }
    }

    if (!metadata) {
      throw new Error("Blob metadata not found")
    }

    // Step 2: Fetch using the URL (for public blobs, use original URL)
    console.log("[BLOB FETCH] Fetching content from validated blob")

    const response = await fetch(url, {
      method: "GET",
      // For public blobs, no special headers needed
    })

    if (!response.ok) {
      console.error("[BLOB FETCH] Fetch failed:", {
        status: response.status,
        statusText: response.statusText,
        url: url,
      })
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Step 3: Get content as text
    const content = await response.text()

    if (!content) {
      console.warn("[BLOB FETCH] Blob content is empty")
      throw new Error("Blob content is empty")
    }

    console.log("[BLOB FETCH] Content fetched successfully:", {
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + "...",
    })

    return content
  } catch (error) {
    console.error("[BLOB FETCH] Error in fetchBlobContent:", error)

    // Handle specific blob errors
    if (error.message?.includes("does not exist")) {
      throw new Error("Document not found in storage. It may have been deleted or the URL is incorrect.")
    }

    if (error.message?.includes("access denied") || error.message?.includes("Access denied")) {
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
    console.warn("[BLOB VALIDATE] No URL provided")
    return false
  }

  console.log("[BLOB VALIDATE] Validating blob exists:", url)

  try {
    // Try public access first
    let metadata
    try {
      metadata = await head(url)
      console.log("[BLOB VALIDATE] Public blob exists")
    } catch (publicError) {
      // Try with token if public fails
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          metadata = await head(url, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          })
          console.log("[BLOB VALIDATE] Private blob exists (with token)")
        } catch (tokenError) {
          console.log("[BLOB VALIDATE] Blob does not exist or is inaccessible:", tokenError.message)
          return false
        }
      } else {
        console.log("[BLOB VALIDATE] Blob does not exist (public access failed, no token):", publicError.message)
        return false
      }
    }

    return !!metadata
  } catch (error) {
    console.error("[BLOB VALIDATE] Error validating blob:", error)
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

  console.log("[BLOB METADATA] Getting metadata for:", url)

  try {
    let metadata
    try {
      // Try public access first
      metadata = await head(url)
      console.log("[BLOB METADATA] Public metadata retrieved")
    } catch (publicError) {
      // Try with token if public fails
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        metadata = await head(url, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        console.log("[BLOB METADATA] Private metadata retrieved with token")
      } else {
        throw publicError
      }
    }

    if (!metadata) {
      throw new Error("Blob not found")
    }

    const result = {
      size: metadata.size,
      contentType: metadata.contentType,
      uploadedAt: metadata.uploadedAt,
      url: metadata.url,
      pathname: metadata.pathname,
    }

    console.log("[BLOB METADATA] Metadata retrieved:", result)
    return result
  } catch (error) {
    console.error("[BLOB METADATA] Error getting metadata:", error)

    if (error.message?.includes("does not exist")) {
      throw new Error("Document not found in storage")
    }

    throw new Error(`Failed to get blob metadata: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Test blob accessibility without throwing errors
 * Useful for health checks and debugging
 *
 * @param url - The Vercel Blob URL to test
 * @returns Promise<{accessible: boolean, error?: string, metadata?: any}>
 */
export async function testBlobAccess(url: string) {
  console.log("[BLOB TEST] Testing blob access:", url)

  if (!url) {
    return { accessible: false, error: "No URL provided" }
  }

  try {
    const metadata = await getBlobMetadata(url)
    console.log("[BLOB TEST] Blob is accessible")
    return { accessible: true, metadata }
  } catch (error) {
    console.log("[BLOB TEST] Blob is not accessible:", error.message)
    return {
      accessible: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
