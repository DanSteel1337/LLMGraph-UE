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
  retries?: number
  initialDelay?: number
  maxDelay?: number
  factor?: number
  jitter?: boolean
  onRetry?: (error: Error, attempt: number) => void
  shouldRetry?: (error: Error) => boolean
  requestId?: string
  context?: Record<string, any>
}

const defaultOptions: RetryOptions = {
  retries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  shouldRetry: () => true,
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(options.maxDelay, options.initialDelay * Math.pow(options.factor, attempt))

  if (options.jitter) {
    // Add random jitter between 0-30%
    return delay * (0.7 + Math.random() * 0.3)
  }

  return delay
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise with the function result
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultOptions, ...options } as Required<RetryOptions>
  const requestId = opts.requestId || generateRequestId()

  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt++

      const isRetryable = error instanceof Error && opts.shouldRetry(error)
      const hasAttemptsLeft = attempt < opts.retries

      if (!isRetryable || !hasAttemptsLeft) {
        // Log the final error with context
        const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
          requestId,
          timestamp: new Date().toISOString(),
          context: {
            ...opts.context,
            retryAttempts: attempt,
          },
        })

        const logEntry = formatErrorForLogging(parsedError, {
          operation: "retry-final-failure",
          attempts: attempt,
          ...opts.context,
        })

        console.error(`Retry failed after ${attempt} attempts:`, JSON.stringify(logEntry, null, 2))

        throw error
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, opts)

      // Log retry attempt
      if (opts.onRetry) {
        opts.onRetry(error instanceof Error ? error : new Error(String(error)), attempt)
      } else {
        console.warn(`Retry attempt ${attempt}/${opts.retries} after ${delay}ms:`, {
          error: error instanceof Error ? error.message : String(error),
          requestId,
          ...opts.context,
        })
      }

      // Wait before next attempt
      await sleep(delay)
    }
  }
}

/**
 * Create a retryable version of a function
 * @param fn Function to make retryable
 * @param options Retry options
 * @returns Retryable function
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {},
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retry(() => fn(...args), options)
  }
}

/**
 * Specialized retry function for Pinecone API operations with enhanced error tracking
 */
export async function retryPineconeOperation<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const defaultOptions = {
    retries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
    shouldRetry: (error: Error) =>
      COMMON_RETRYABLE_ERRORS.some((pattern) => {
        if (typeof pattern === "string") {
          return error.message.includes(pattern)
        }
        return pattern.test(error.message)
      }),
  }

  const opts = { ...defaultOptions, ...options } as Required<RetryOptions>
  const requestId = options.requestId || generateRequestId()

  let lastError: Error
  let attempt = 0

  while (attempt <= opts.retries) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Enhanced error logging for Pinecone operations
      const parsedError = parseError(lastError, {
        requestId,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        service: "pinecone",
        operation: "vector-operation",
        retryAttempt: attempt + 1,
        maxRetries: opts.retries,
        ...opts.context,
      })

      console.error(
        `Pinecone operation retry ${attempt + 1}/${opts.retries} failed:`,
        JSON.stringify(logEntry, null, 2),
      )

      // Check if we should retry based on error type
      const shouldRetry = opts.shouldRetry(lastError)

      if (!shouldRetry || attempt >= opts.retries) {
        // Log final Pinecone failure
        const finalLogEntry = formatErrorForLogging(parsedError, {
          requestId,
          timestamp: new Date().toISOString(),
          service: "pinecone",
          finalFailure: true,
          shouldRetry,
          totalAttempts: attempt + 1,
          ...opts.context,
        })

        console.error("Pinecone operation final failure:", JSON.stringify(finalLogEntry, null, 2))
        throw lastError
      }

      // Calculate backoff time
      const delay = calculateDelay(attempt, opts)

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt)
      }

      // Wait before retrying
      await sleep(delay)

      attempt++
    }
  }

  throw new Error("Unexpected state: retryPineconeOperation should have thrown an error before reaching here.")
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
