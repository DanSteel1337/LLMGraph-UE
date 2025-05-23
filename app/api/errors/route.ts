/**
 * Error Reporting API Route
 *
 * Purpose: Collect and store client-side errors for debugging
 * Features:
 * - Accepts error reports from client-side error boundaries
 * - Stores errors in KV for analysis
 * - Provides error retrieval for debugging
 *
 * Runtime: Edge Runtime compatible
 */

import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../lib/utils/env"
import { createEdgeClient } from "../../../lib/supabase-server"
import {
  parseError,
  formatErrorForLogging,
  createRequestContext,
  withErrorTracking,
} from "../../../lib/middleware/error-tracking"

export const runtime = "edge"

async function reportErrorHandler(request: NextRequest) {
  const context = createRequestContext(request)

  validateEnv(["SUPABASE", "VERCEL_KV"])

  // Validate authentication
  const supabase = createEdgeClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error("Unauthorized: Authentication required")
  }

  const body = await request.json()
  const { error: clientError, context: clientContext, userAgent, url } = body

  if (!clientError) {
    throw new Error("Bad Request: Error object is required")
  }

  // Create error object from client data
  const errorObj = new Error(clientError.message || "Client-side error")
  errorObj.name = clientError.name || "ClientError"
  errorObj.stack = clientError.stack

  // Parse error with context
  const parsedError = parseError(errorObj, {
    requestId: context.requestId,
    userId: data.user.id,
    userAgent: userAgent || request.headers.get("user-agent") || undefined,
    url: url || clientContext?.url,
    timestamp: new Date().toISOString(),
  })

  const logEntry = formatErrorForLogging(parsedError, {
    ...context,
    userId: data.user.id,
    ...clientContext,
  })

  // Store error in KV for analysis
  const errorKey = `error:${parsedError.requestId}`
  await kv.set(errorKey, logEntry, { ex: 86400 * 7 }) // 7 days TTL

  // Log error
  console.error("Client Error Report:", JSON.stringify(logEntry, null, 2))

  return NextResponse.json(
    {
      success: true,
      errorId: parsedError.requestId,
      timestamp: parsedError.timestamp,
    },
    {
      headers: {
        "x-request-id": context.requestId || "unknown",
      },
    },
  )
}

async function getErrorsHandler(request: NextRequest) {
  const context = createRequestContext(request)

  validateEnv(["SUPABASE", "VERCEL_KV"])

  // Validate authentication
  const supabase = createEdgeClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error("Unauthorized: Authentication required")
  }

  const url = new URL(request.url)
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)
  const offset = Number.parseInt(url.searchParams.get("offset") || "0", 10)

  // Get recent errors (this is a simplified implementation)
  // In a real application, you might want to use a proper database
  const errors: any[] = []

  return NextResponse.json(
    {
      errors,
      total: errors.length,
      limit,
      offset,
    },
    {
      headers: {
        "x-request-id": context.requestId || "unknown",
      },
    },
  )
}

export const POST = withErrorTracking(reportErrorHandler)
export const GET = withErrorTracking(getErrorsHandler)
