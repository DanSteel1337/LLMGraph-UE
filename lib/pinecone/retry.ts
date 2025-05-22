/**
 * Pinecone API Retry Utility
 *
 * Purpose: Provides retry functionality for Pinecone API calls
 * Logic:
 * - Implements exponential backoff
 * - Handles transient errors
 * - Provides configurable retry options
 * Runtime context: Edge Function
 */

interface RetryOptions {
  retries?: number
  minTimeout?: number
  maxTimeout?: number
  factor?: number
  onRetry?: (error: Error, attempt: number) => void
}

export async function retryPineconeOperation<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, minTimeout = 1000, maxTimeout = 10000, factor = 2, onRetry } = options

  let lastError: Error
  let attempt = 0

  while (attempt <= retries) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry based on error type
      // Rate limits and network errors are good candidates for retry
      const shouldRetry =
        lastError.message.includes("rate limit") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("network") ||
        lastError.message.includes("5") // 5xx errors

      if (!shouldRetry || attempt >= retries) {
        throw lastError
      }

      // Calculate backoff time
      const timeout = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout)

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, timeout))

      attempt++
    }
  }

  throw lastError!
}
