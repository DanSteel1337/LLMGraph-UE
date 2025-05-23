/**
 * Edge-compatible error parsing utilities
 *
 * Purpose: Parse and format errors without Node.js dependencies
 * Features:
 * - Stack trace parsing using only string manipulation
 * - Source map support through browser APIs
 * - Request context tracking
 * - Structured error formatting
 *
 * Runtime: Edge Runtime compatible (Web APIs only)
 */

export interface ParsedError {
  message: string
  name: string
  stack?: string
  cause?: unknown
  timestamp: string
  requestId?: string
  userAgent?: string
  url?: string
  line?: number
  column?: number
  filename?: string
  source?: string
  context: Record<string, unknown>
}

export interface ErrorContext {
  requestId?: string
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  method?: string
  headers?: Record<string, string>
  timestamp?: string
  service?: string
  operation?: string
  context?: Record<string, unknown>
}

/**
 * Parse error stack trace using only string manipulation
 * Works in Edge Runtime without Node.js dependencies
 */
export function parseStackTrace(stack: string): Array<{
  function?: string
  filename?: string
  line?: number
  column?: number
  source?: string
}> {
  if (!stack) return []

  const lines = stack.split("\n")
  const frames: Array<{
    function?: string
    filename?: string
    line?: number
    column?: number
    source?: string
  }> = []

  for (const line of lines) {
    // Skip the error message line
    if (!line.trim().startsWith("at ")) continue

    // Parse different stack trace formats
    const chromeMatch = line.match(/at\s+(.+?)\s+$$(.+?):(\d+):(\d+)$$/)
    const firefoxMatch = line.match(/(.+?)@(.+?):(\d+):(\d+)/)
    const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/)

    if (chromeMatch) {
      frames.push({
        function: chromeMatch[1],
        filename: chromeMatch[2],
        line: Number.parseInt(chromeMatch[3], 10),
        column: Number.parseInt(chromeMatch[4], 10),
        source: line.trim(),
      })
    } else if (firefoxMatch) {
      frames.push({
        function: firefoxMatch[1],
        filename: firefoxMatch[2],
        line: Number.parseInt(firefoxMatch[3], 10),
        column: Number.parseInt(firefoxMatch[4], 10),
        source: line.trim(),
      })
    } else if (simpleMatch) {
      frames.push({
        filename: simpleMatch[1],
        line: Number.parseInt(simpleMatch[2], 10),
        column: Number.parseInt(simpleMatch[3], 10),
        source: line.trim(),
      })
    }
  }

  return frames
}

/**
 * Generate a unique request ID for tracking
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for environments without crypto.randomUUID
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse error with context information
 * Edge Runtime compatible - uses only Web APIs
 */
export function parseError(error: Error, context?: Partial<ErrorContext>): ParsedError {
  const timestamp = context?.timestamp || new Date().toISOString()
  const requestId = context?.requestId || generateRequestId()

  // Extract basic error information
  const parsed: ParsedError = {
    message: error.message || "Unknown error",
    name: error.name || "Error",
    timestamp,
    requestId,
    userAgent: context?.userAgent,
    url: context?.url,
    context: {
      ...context,
      service: context?.service || "llmgraph-ue",
      operation: context?.operation,
    },
  }

  // Parse stack trace if available
  if (error.stack) {
    parsed.stack = error.stack
    const frames = parseStackTrace(error.stack)

    if (frames.length > 0) {
      const topFrame = frames[0]
      parsed.line = topFrame.line
      parsed.column = topFrame.column
      parsed.filename = topFrame.filename
      parsed.source = topFrame.source
    }
  }

  // Include cause if available (Error.cause is a newer feature)
  if ("cause" in error && error.cause) {
    parsed.cause = error.cause
  }

  return parsed
}

/**
 * Format error for logging
 * Creates a structured log entry suitable for debugging
 */
export function formatErrorForLogging(
  parsedError: ParsedError,
  additionalContext?: Partial<ErrorContext>,
): Record<string, unknown> {
  return {
    error: {
      message: parsedError.message,
      name: parsedError.name,
      stack: parsedError.stack,
      line: parsedError.line,
      column: parsedError.column,
      filename: parsedError.filename,
      source: parsedError.source,
      cause: parsedError.cause,
    },
    context: {
      requestId: parsedError.requestId || additionalContext?.requestId,
      timestamp: parsedError.timestamp || additionalContext?.timestamp || new Date().toISOString(),
      url: parsedError.url || additionalContext?.url,
      userAgent: parsedError.userAgent || additionalContext?.userAgent,
      userId: additionalContext?.userId,
      sessionId: additionalContext?.sessionId,
      method: additionalContext?.method,
      headers: additionalContext?.headers,
      service: parsedError.context.service || additionalContext?.service || "llmgraph-ue",
      operation: parsedError.context.operation || additionalContext?.operation,
      ...additionalContext?.context,
    },
    level: "error",
    environment: process.env.NODE_ENV || "development",
  }
}

/**
 * Sanitize error for client-side display
 * Removes sensitive information in production
 */
export function sanitizeErrorForClient(error: ParsedError): Partial<ParsedError> {
  const isProduction = process.env.NODE_ENV === "production"

  if (isProduction) {
    // In production, only return basic error information
    return {
      message: error.message,
      name: error.name,
      timestamp: error.timestamp,
      requestId: error.requestId,
    }
  }

  // In development, return full error details but remove sensitive context
  const { context, ...safeError } = error
  return {
    ...safeError,
    context: {
      service: context.service,
      operation: context.operation,
    },
  }
}

/**
 * Extract request context from Web API Request object
 * Edge Runtime compatible
 */
export function extractRequestContext(request: Request): ErrorContext {
  const url = new URL(request.url)
  const timestamp = new Date().toISOString()

  return {
    requestId: generateRequestId(),
    url: request.url,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    headers: Object.fromEntries(
      Array.from(request.headers.entries()).filter(([key]) =>
        // Only include safe headers
        ["content-type", "accept", "user-agent", "referer"].includes(key.toLowerCase()),
      ),
    ),
    timestamp,
  }
}

/**
 * Create error boundary wrapper for Edge API routes
 */
export function withErrorBoundary<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>,
) {
  return async (...args: T): Promise<R> => {
    const requestId = context?.requestId || generateRequestId()
    const startTime = Date.now()

    try {
      return await handler(...args)
    } catch (error) {
      const duration = Date.now() - startTime

      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        ...context,
        requestId,
      })

      const logEntry = formatErrorForLogging(parsedError, {
        ...context,
        requestId,
      })

      // Add duration to log entry
      logEntry.duration = `${duration}ms`

      // Log to console (Vercel will capture this)
      console.error("Edge API Error:", JSON.stringify(logEntry, null, 2))

      // Re-throw the error to be handled by the caller
      throw error
    }
  }
}
