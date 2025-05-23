/**
 * Edge-compatible Error Parser
 *
 * Purpose: Parse and format errors in Edge Runtime
 * Features:
 * - Stack trace parsing
 * - Error context enrichment
 * - Request ID generation
 * - Structured error logging
 *
 * Runtime: Edge Runtime compatible
 */

// Define error context interface
export interface ErrorContext {
  requestId?: string
  userId?: string
  url?: string
  method?: string
  userAgent?: string
  timestamp: string
  headers?: Record<string, string>
  body?: string
  context?: Record<string, any>
}

// Define parsed error interface
export interface ParsedError {
  name: string
  message: string
  stack?: string
  timestamp: string
  requestId?: string
  url?: string
  method?: string
  userAgent?: string
  filename?: string
  line?: number
  column?: number
  context?: Record<string, any>
}

/**
 * Generate a request ID for tracking
 * @returns Unique request ID
 */
export function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
}

/**
 * Parse an error object with additional context
 * @param error Error object
 * @param context Additional context
 * @returns Parsed error with context
 */
export function parseError(error: Error, context: Partial<ErrorContext> = {}): ParsedError {
  const timestamp = context.timestamp || new Date().toISOString()

  // Extract filename, line, and column from stack trace if available
  let filename: string | undefined
  let line: number | undefined
  let column: number | undefined

  if (error.stack) {
    const stackLines = error.stack.split("\n")
    // Skip the first line (error message)
    for (let i = 1; i < stackLines.length; i++) {
      const lineText = stackLines[i]
      // Match common stack trace formats
      const match = lineText.match(/at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))/)
      if (match) {
        filename = match[2]
        line = Number.parseInt(match[3], 10)
        column = Number.parseInt(match[4], 10)
        break
      }
    }
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp,
    requestId: context.requestId,
    url: context.url,
    method: context.method,
    userAgent: context.userAgent,
    filename,
    line,
    column,
    context: context.context,
  }
}

/**
 * Format error for logging
 * @param error Parsed error
 * @param additionalContext Additional context
 * @returns Formatted error for logging
 */
export function formatErrorForLogging(
  error: ParsedError,
  additionalContext: Record<string, any> = {},
): Record<string, any> {
  return {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"), // First 5 lines only
    },
    requestId: error.requestId,
    timestamp: error.timestamp,
    url: error.url,
    method: error.method,
    userAgent: error.userAgent,
    location: error.filename ? `${error.filename}:${error.line}:${error.column}` : undefined,
    ...additionalContext,
  }
}

/**
 * Parse a stack trace into structured frames
 * @param stack Stack trace string
 * @returns Array of parsed stack frames
 */
export function parseStackTrace(stack: string): Array<{
  function?: string
  filename?: string
  line?: number
  column?: number
  type?: "app" | "framework" | "dependency" | "node" | "unknown"
}> {
  if (!stack) return []

  const lines = stack.split("\n")
  const frames: Array<{
    function?: string
    filename?: string
    line?: number
    column?: number
    type?: "app" | "framework" | "dependency" | "node" | "unknown"
  }> = []

  for (const line of lines) {
    // Skip the error message line
    if (!line.trim().startsWith("at ")) continue

    // Parse different stack trace formats
    const chromeMatch = line.match(/at\s+(.+?)\s+$$(.+?):(\d+):(\d+)$$/)
    const firefoxMatch = line.match(/(.+?)@(.+?):(\d+):(\d+)/)
    const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/)

    let frame: {
      function?: string
      filename?: string
      line?: number
      column?: number
      type?: "app" | "framework" | "dependency" | "node" | "unknown"
    } = {}

    if (chromeMatch) {
      frame = {
        function: chromeMatch[1],
        filename: chromeMatch[2],
        line: Number.parseInt(chromeMatch[3], 10),
        column: Number.parseInt(chromeMatch[4], 10),
      }
    } else if (firefoxMatch) {
      frame = {
        function: firefoxMatch[1],
        filename: firefoxMatch[2],
        line: Number.parseInt(firefoxMatch[3], 10),
        column: Number.parseInt(firefoxMatch[4], 10),
      }
    } else if (simpleMatch) {
      frame = {
        filename: simpleMatch[1],
        line: Number.parseInt(simpleMatch[2], 10),
        column: Number.parseInt(simpleMatch[3], 10),
      }
    }

    // Determine frame type
    if (frame.filename) {
      if (frame.filename.includes("/node_modules/")) {
        if (frame.filename.includes("/node_modules/next/") || frame.filename.includes("/node_modules/react/")) {
          frame.type = "framework"
        } else {
          frame.type = "dependency"
        }
      } else if (frame.filename.includes("webpack-internal:") || frame.filename.includes("/<")) {
        frame.type = "framework"
      } else if (frame.filename.startsWith("/")) {
        frame.type = "app"
      } else if (frame.filename.includes("node:")) {
        frame.type = "node"
      } else {
        frame.type = "unknown"
      }
    }

    frames.push(frame)
  }

  return frames
}
