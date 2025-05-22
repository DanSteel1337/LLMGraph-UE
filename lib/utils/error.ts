/**
 * Purpose: Basic error handling
 * Logic:
 * - Provides error handling utilities
 * Runtime context: Edge Function
 */
export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = "AppError"
  }
}

export function handleApiError(error: unknown) {
  console.error("API error:", error)

  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  })
}
