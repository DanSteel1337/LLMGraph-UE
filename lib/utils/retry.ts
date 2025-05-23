/**
 * Retry Utilities with Enhanced Error Tracking
 *
 * Purpose: Provides retry functionality for async operations with source map support
 * Logic:
 * - Implements exponential backoff
 * - Handles transient errors
 * - Provides configurable retry options
 * - Includes specialized retry functions for specific services
 * - Enhanced error tracking and logging
 * Runtime context: Edge Function
 */

import { parseError, formatErrorForLogging, generateRequestId } from "./edge-error-parser"

export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  factor?: number
  jitter?: boolean
  retryableErrors?: Array<string | RegExp>
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 3000,
  factor: 2,
  jitter: true,
}

/**
 * Retry a function with exponential backoff
 * Edge Runtime compatible
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  context: Record<string, unknown> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const requestId = context.requestId || generateRequestId()

  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt++

      // Enhanced error logging for retries
      const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
        requestId: requestId as string,
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          retryAttempt: attempt,
          maxRetries: opts.maxRetries,
        },
      })

      // Check if we've exceeded max retries
      if (attempt >= opts.maxRetries) {
        // Log final failure
        const logEntry = formatErrorForLogging(parsedError, {
          context: {
            finalRetryFailure: true,
            totalAttempts: attempt,
          },
        })

        console.error(`Retry failed after ${attempt} attempts:`, JSON.stringify(logEntry, null, 2))
        throw error
      }

      // Check if error is retryable
      if (opts.retryableErrors && !isRetryableError(error, opts.retryableErrors)) {
        // Log non-retryable error
        const logEntry = formatErrorForLogging(parsedError, {
          context: {
            retryable: false,
            reason: "non-retryable-error",
          },
        })

        console.error("Non-retryable error:", JSON.stringify(logEntry, null, 2))
        throw error
      }

      // Calculate delay with exponential backoff
      let delay = opts.initialDelay * Math.pow(opts.factor || 2, attempt - 1)

      // Apply maximum delay
      delay = Math.min(delay, opts.maxDelay)

      // Add jitter if enabled
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }

      // Log retry attempt
      console.warn(`Retry attempt ${attempt}/${opts.maxRetries} after ${Math.round(delay)}ms:`, {
        error: parsedError.message,
        requestId,
        timestamp: new Date().toISOString(),
      })

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(error instanceof Error ? error : new Error(String(error)), attempt, delay)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

/**
 * Check if an error is retryable based on patterns
 */
function isRetryableError(error: unknown, patterns: Array<string | RegExp>): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error)

  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return errorMessage.includes(pattern)
    }
    return pattern.test(errorMessage)
  })
}

/**
 * Common retryable error patterns
 */
export const COMMON_RETRYABLE_ERRORS = [
  // Network errors
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENETUNREACH",
  "socket hang up",
  "network error",
  // HTTP errors
  "429", // Too Many Requests
  "503", // Service Unavailable
  "504", // Gateway Timeout
  // Pinecone specific
  "rate limit",
  "timeout",
  "too many requests",
  // Generic transient errors
  "internal server error",
  "temporarily unavailable",
]

/**
 * Specialized retry function for Pinecone API operations with enhanced error tracking
 */
export async function retryPineconeOperation<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    jitter = true,
    retryableErrors = COMMON_RETRYABLE_ERRORS,
    onRetry,
    requestId,
    context,
  } = options

  let lastError: Error
  let attempt = 0

  while (true) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Enhanced error logging for Pinecone operations
      const parsedError = parseError(lastError, {
        requestId: requestId || generateRequestId(),
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId: requestId || generateRequestId(),
        timestamp: new Date().toISOString(),
        service: "pinecone",
        operation: "vector-operation",
        retryAttempt: attempt + 1,
        maxRetries: maxRetries,
        ...context,
      })

      console.error(`Pinecone operation retry ${attempt + 1}/${maxRetries} failed:`, JSON.stringify(logEntry, null, 2))

      // Check if we should retry based on error type
      const shouldRetry = isRetryableError(lastError, retryableErrors)

      if (!shouldRetry || attempt >= maxRetries) {
        // Log final Pinecone failure
        const finalLogEntry = formatErrorForLogging(parsedError, {
          requestId: requestId || generateRequestId(),
          timestamp: new Date().toISOString(),
          service: "pinecone",
          finalFailure: true,
          shouldRetry,
          totalAttempts: attempt + 1,
          ...context,
        })

        console.error("Pinecone operation final failure:", JSON.stringify(finalLogEntry, null, 2))
        throw lastError
      }

      // Calculate backoff time
      let delay = initialDelay * Math.pow(factor || 2, attempt - 1)

      // Apply maximum delay
      delay = Math.min(delay, maxDelay)

      // Add jitter if enabled
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt, delay)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      attempt++
    }
  }
}
