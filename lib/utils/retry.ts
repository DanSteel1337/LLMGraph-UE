/**
 * Retry Utilities
 *
 * Purpose: Provides retry functionality for API calls
 * Logic:
 * - Implements exponential backoff
 * - Handles transient errors
 * - Provides configurable retry options
 * - Includes specialized retry functions for specific services
 * Runtime context: Edge Function
 */

interface RetryOptions {
  retries?: number
  minTimeout?: number
  maxTimeout?: number
  factor?: number
  onRetry?: (error: Error, attempt: number) => void
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, minTimeout = 1000, maxTimeout = 10000, factor = 2, onRetry = () => {} } = options

  let attempt = 0
  let lastError: Error

  while (attempt < retries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      attempt++

      if (attempt >= retries) {
        break
      }

      onRetry(lastError, attempt)

      // Calculate backoff delay
      const delay = Math.min(maxTimeout, minTimeout * Math.pow(factor, attempt - 1))

      // Add jitter to avoid thundering herd
      const jitter = Math.random() * 0.3 * delay
      const backoff = delay + jitter

      await new Promise((resolve) => setTimeout(resolve, backoff))
    }
  }

  throw lastError!
}

// Specialized retry for Pinecone operations
export async function retryPineconeOperation<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  return retry(fn, {
    retries: 5,
    minTimeout: 500,
    maxTimeout: 5000,
    factor: 1.5,
    ...options,
    onRetry: (error, attempt) => {
      console.warn(`Pinecone operation failed (attempt ${attempt}): ${error.message}`)
      if (options.onRetry) {
        options.onRetry(error, attempt)
      }
    },
  })
}
