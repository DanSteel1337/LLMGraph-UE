/**
 * Request Context Extraction Utilities
 *
 * Purpose: Extract context information from HTTP requests
 * Features:
 * - Extract safe request information for logging
 * - Generate request IDs
 * - Format request context for error tracking
 * - Safe header extraction
 * - URL parsing
 * - User agent detection
 * - IP address extraction (when available)
 *
 * Runtime: Edge Runtime compatible
 */

import type { NextRequest } from "next/server"
import { generateRequestId } from "./edge-error-parser"
import type { ErrorContext } from "./edge-error-parser"

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
  ip?: string
  device?: string
  isMobile?: boolean
}

/**
 * Extract context information from a request
 * Edge Runtime compatible - uses only Web APIs
 */
export function extractRequestContext(
  request: NextRequest,
  options: {
    includeSensitiveHeaders?: boolean
    sensitiveHeaders?: string[]
  } = {},
): ErrorContext {
  const url = new URL(request.url)
  const timestamp = new Date().toISOString()

  // Default sensitive headers
  const sensitiveHeaders = options.sensitiveHeaders || [
    "authorization",
    "cookie",
    "x-api-key",
    "x-auth-token",
    "api-key",
    "auth-token",
    "password",
    "secret",
  ]

  // Extract safe headers
  const headers: Record<string, string> = {}
  if (!options.includeSensitiveHeaders) {
    request.headers.forEach((value, key) => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        headers[key] = value
      }
    })
  } else {
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
  }

  // Build context object
  const context: ErrorContext = {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp,
    headers,
  }

  // Add IP if available
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")
  if (ip) {
    context.ip = ip
  }

  // Add referrer if available
  const referrer = request.headers.get("referer")
  if (referrer) {
    context.referrer = referrer
  }

  // Detect client information from user agent
  const clientInfo = detectClientInfo(request.headers.get("user-agent"))
  context.device = clientInfo.device
  context.isMobile = clientInfo.isMobile

  return context
}

/**
 * Extract safe request information for logging
 * Simplified version that only includes non-sensitive information
 */
export function extractSafeRequestInfo(request: NextRequest): Record<string, unknown> {
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
export function createRequestContext(request: NextRequest): RequestContext {
  return {
    requestId: generateRequestId(),
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Extract path parameters from a URL pattern
 * @param url Current URL
 * @param pattern URL pattern with :param placeholders
 * @returns Object with extracted parameters
 */
export function extractPathParams(url: string, pattern: string): Record<string, string> {
  const urlObj = new URL(url)
  const patternParts = pattern.split("/")
  const pathParts = urlObj.pathname.split("/")

  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      const paramName = patternParts[i].substring(1)
      params[paramName] = pathParts[i] || ""
    }
  }

  return params
}

/**
 * Extract query parameters from a URL
 * @param url URL to extract from
 * @returns Object with query parameters
 */
export function extractQueryParams(url: string): Record<string, string> {
  const urlObj = new URL(url)
  const params: Record<string, string> = {}

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

/**
 * Detect client information from user agent
 * @param userAgent User agent string
 * @returns Client information
 */
export function detectClientInfo(userAgent?: string): {
  browser?: string
  os?: string
  device?: string
  isMobile?: boolean
} {
  if (!userAgent) return {}

  const ua = userAgent.toLowerCase()

  // Simple detection logic
  const info: {
    browser?: string
    os?: string
    device?: string
    isMobile?: boolean
  } = {}

  // Browser detection
  if (ua.includes("firefox")) {
    info.browser = "Firefox"
  } else if (ua.includes("chrome")) {
    info.browser = "Chrome"
  } else if (ua.includes("safari")) {
    info.browser = "Safari"
  } else if (ua.includes("edge")) {
    info.browser = "Edge"
  } else if (ua.includes("opera")) {
    info.browser = "Opera"
  }

  // OS detection
  if (ua.includes("windows")) {
    info.os = "Windows"
  } else if (ua.includes("mac")) {
    info.os = "macOS"
  } else if (ua.includes("linux")) {
    info.os = "Linux"
  } else if (ua.includes("android")) {
    info.os = "Android"
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    info.os = "iOS"
  }

  // Mobile detection
  info.isMobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")

  // Device type
  if (ua.includes("ipad") || ua.includes("tablet")) {
    info.device = "Tablet"
  } else if (info.isMobile) {
    info.device = "Mobile"
  } else {
    info.device = "Desktop"
  }

  return info
}
