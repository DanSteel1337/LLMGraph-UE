/**
 * Request Context Extraction Utilities
 *
 * Purpose: Extract context information from HTTP requests
 * Features:
 * - Extract safe request information for logging
 * - Generate request IDs
 * - Format request context for error tracking
 *
 * Runtime: Edge Runtime compatible
 */

import type { NextRequest } from "next/server"
import { generateRequestId } from "./edge-error-parser"

export interface RequestContext {
  requestId?: string
  url?: string
  method?: string
  userAgent?: string
  timestamp: string
  headers?: Record<string, string>
  pathname?: string
  search?: string
  referrer?: string
  contentType?: string
  contentLength?: string
}

/**
 * Extract context information from a request
 * Edge Runtime compatible - uses only Web APIs
 */
export function extractRequestContext(request: NextRequest | Request): RequestContext {
  const url = new URL(request.url)
  const timestamp = new Date().toISOString()
  const requestId = generateRequestId()

  return {
    requestId,
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp,
    pathname: url.pathname,
    search: url.search,
    referrer: request.headers.get("referer") || undefined,
    contentType: request.headers.get("content-type") || undefined,
    contentLength: request.headers.get("content-length") || undefined,
    headers: Object.fromEntries(
      Array.from(request.headers.entries()).filter(([key]) =>
        // Only include safe headers
        ["content-type", "accept", "user-agent", "referer"].includes(key.toLowerCase()),
      ),
    ),
  }
}

/**
 * Extract safe request information for logging
 * Simplified version that only includes non-sensitive information
 */
export function extractSafeRequestInfo(request: NextRequest | Request): Record<string, unknown> {
  const url = new URL(request.url)

  return {
    method: request.method,
    pathname: url.pathname,
    search: url.search,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create a request context with a unique ID
 * Useful for tracking requests across multiple services
 */
export function createRequestContext(request: NextRequest | Request): RequestContext {
  return {
    requestId: generateRequestId(),
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp: new Date().toISOString(),
  }
}
