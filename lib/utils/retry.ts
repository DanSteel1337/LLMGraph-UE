/**
 * Purpose: Simple retry logic
 * Logic:
 * - Implements exponential backoff retry
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
  const { retries = 3, minTimeout = 1000, maxTimeout = 30000, factor = 2, onRetry } = options

  let attempt = 0
  let lastError: Error

  while (attempt < retries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (onRetry) {
        onRetry(lastError, attempt)
      }

      attempt++

      if (attempt >= retries) {
        break
      }

      const timeout = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout)

      await new Promise((resolve) => setTimeout(resolve, timeout))
    }
  }

  throw lastError!
}
