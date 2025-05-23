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
  randomize?: boolean
  onRetry?: (error: Error, attempt: number) => void
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    factor = 2,
    minTimeout = 1000,
    maxTimeout = 30000,
    randomize = true,
    onRetry = () => {},
  } = options

  let attempt = 0
  let timeout = minTimeout

  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt++

      if (attempt >= retries) {
        throw error
      }

      // Calculate next timeout with exponential backoff
      timeout = Math.min(timeout * factor, maxTimeout)

      // Add randomization to prevent thundering herd
      if (randomize) {
        timeout = Math.random() * timeout * 0.5 + timeout * 0.5
      }

      onRetry(error instanceof Error ? error : new Error(String(error)), attempt)

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, timeout))
    }
  }
}

// Specialized retry for Pinecone operations
export async function retryPineconeOperation<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const defaultOptions: RetryOptions = {
    retries: 5,
    factor: 2,
    minTimeout: 500,
    maxTimeout: 10000,
    randomize: true,
  }

  const mergedOptions = { ...defaultOptions, ...options }

  try {
    return await retry(fn, mergedOptions)
  } catch (error) {
    // Add context to the error
    if (error instanceof Error) {
      error.message = `Pinecone operation failed after ${mergedOptions.retries} attempts: ${error.message}`
    }
    throw error
  }
}
