/**
 * Edge Runtime Error Tracking Middleware
 *
 * Purpose: Capture and format errors in Edge Runtime without Node.js APIs
 * Features:
 * - Request ID tracking for debugging
 * - Structured error logging
 * - Context capture using Web APIs only
 * - Vercel-compatible logging format
 *
 * Runtime: Edge Runtime compatible
 */

import { NextRequest, NextResponse } from "next/server"
import {
  parseError,
  extractRequestContext,
  formatErrorForLogging,
  generateRequestId,
  type ErrorContext,
} from "@/lib/utils/edge-error-parser"

export interface ErrorTrackingOptions {
  includeHeaders?: boolean
  includeBody?: boolean
  maxBodySize?: number
  sensitiveHeaders?: string[]
  enableStackTrace?: boolean
  enableRequestLogging?: boolean
}

const DEFAULT_OPTIONS: ErrorTrackingOptions = {
  includeHeaders: true,
  includeBody: false,
  maxBodySize: 1024, // 1KB
  sensitiveHeaders: ["authorization", "cookie", "x-api-key", "x-auth-token"],
  enableStackTrace: process.env.NODE_ENV === "development",
  enableRequestLogging: true,
}

/**
 * Create error tracking middleware for Edge Runtime
 */
export function createErrorTrackingMiddleware(options: ErrorTrackingOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  return function errorTrackingMiddleware(handler: (request: NextRequest) => Promise<Response>) {
    return async function wrappedHandler(request: NextRequest): Promise<Response> {
      const requestId = generateRequestId()
      const startTime = Date.now()

      // Add request ID to headers for tracking
      const requestWithId = new NextRequest(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          "x-request-id": requestId,
        },
      })

      try {
        // Extract request context
        const context = extractRequestContext(request)
        context.requestId = requestId

        // Log request start if enabled
        if (config.enableRequestLogging) {
          console.log("📥 Request started:", {
            requestId,
            method: request.method,
            url: request.url,
            userAgent: request.headers.get("user-agent"),
            timestamp: context.timestamp,
            contentType: request.headers.get("content-type"),
          })
        }

        // Call the handler
        const response = await handler(requestWithId)

        // Log successful response
        const duration = Date.now() - startTime
        if (config.enableRequestLogging) {
          console.log("📤 Request completed:", {
            requestId,
            status: response.status,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            contentType: response.headers.get("content-type"),
          })
        }

        // Add request ID to response headers
        const newHeaders = new Headers(response.headers)
        newHeaders.set("x-request-id", requestId)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      } catch (error) {
        const duration = Date.now() - startTime

        // Parse and format error
        const context: ErrorContext = {
          requestId,
          url: request.url,
          method: request.method,
          userAgent: request.headers.get("user-agent") || undefined,
          timestamp: new Date().toISOString(),
        }

        // Include headers if configured
        if (config.includeHeaders) {
          context.headers = Object.fromEntries(
            Array.from(request.headers.entries()).filter(
              ([key]) => !config.sensitiveHeaders?.includes(key.toLowerCase()),
            ),
          )
        }

        // Include request body if configured and available
        if (config.includeBody && request.body) {
          try {
            const clonedRequest = request.clone()
            const bodyText = await clonedRequest.text()
            if (bodyText.length <= config.maxBodySize!) {
              context.body = bodyText
            } else {
              context.body = `[Body too large: ${bodyText.length} bytes]`
            }
          } catch (bodyError) {
            context.body = "[Failed to read body]"
          }
        }

        const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), context)

        const logEntry = formatErrorForLogging(parsedError, context)

        // Add request duration to log
        logEntry.duration = `${duration}ms`
        logEntry.severity = "error"
        logEntry.service = "llmgraph-ue"

        // Log error with full context
        console.error("🚨 Request failed:", JSON.stringify(logEntry, null, 2))

        // Determine error response based on error type
        let statusCode = 500
        let errorMessage = "An unexpected error occurred"

        if (error instanceof Error) {
          // Map specific error types to status codes
          if (error.message.includes("unauthorized") || error.message.includes("authentication")) {
            statusCode = 401
            errorMessage = "Authentication required"
          } else if (error.message.includes("forbidden") || error.message.includes("permission")) {
            statusCode = 403
            errorMessage = "Access forbidden"
          } else if (error.message.includes("not found")) {
            statusCode = 404
            errorMessage = "Resource not found"
          } else if (error.message.includes("validation") || error.message.includes("invalid")) {
            statusCode = 400
            errorMessage = "Invalid request"
          } else if (error.message.includes("rate limit")) {
            statusCode = 429
            errorMessage = "Rate limit exceeded"
          }
        }

        // Create error response
        const errorResponse = {
          error: errorMessage,
          requestId,
          timestamp: parsedError.timestamp,
          ...(process.env.NODE_ENV === "development" &&
            config.enableStackTrace && {
              details: {
                message: parsedError.message,
                name: parsedError.name,
                stack: parsedError.stack,
              },
            }),
        }

        return NextResponse.json(errorResponse, {
          status: statusCode,
          headers: {
            "x-request-id": requestId,
            "content-type": "application/json",
          },
        })
      }
    }
  }
}

/**
 * Simplified error wrapper for API routes
 */
export function withErrorTracking<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>,
) {
  return async (...args: T): Promise<R> => {
    const requestId = context?.requestId || generateRequestId()

    try {
      return await handler(...args)
    } catch (error) {
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        ...context,
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, context)

      // Log to console (Vercel will capture this)
      console.error("🚨 API Error:", JSON.stringify(logEntry, null, 2))

      // Re-throw the error to be handled by the caller
      throw error
    }
  }
}

/**
 * Extract safe request information for logging
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
 * Create a request context for error tracking
 */
export function createRequestContext(request: NextRequest): ErrorContext {
  return {
    requestId: generateRequestId(),
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Health check wrapper with error tracking
 */
export function withHealthCheck<T>(
  serviceName: string,
  healthCheckFn: () => Promise<T>,
): () => Promise<{ status: "healthy" | "unhealthy"; service: string; timestamp: string; details?: T; error?: string }> {
  return async () => {
    const timestamp = new Date().toISOString()
    const requestId = generateRequestId()

    try {
      const details = await healthCheckFn()

      console.log(`✅ Health check passed for ${serviceName}:`, {
        requestId,
        service: serviceName,
        status: "healthy",
        timestamp,
      })

      return {
        status: "healthy" as const,
        service: serviceName,
        timestamp,
        details,
      }
    } catch (error) {
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        timestamp,
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp,
        service: serviceName,
      })

      console.error(`❌ Health check failed for ${serviceName}:`, JSON.stringify(logEntry, null, 2))

      return {
        status: "unhealthy" as const,
        service: serviceName,
        timestamp,
        error: parsedError.message,
      }
    }
  }
}
