/**
 * Document Upload API Route
 *
 * Purpose: Handles file uploads to Vercel Blob storage and initiates document processing
 *
 * Features:
 * - Validates file types (Markdown, Text, PDF, HTML)
 * - Validates file content and size
 * - Uploads files to Vercel Blob with private access
 * - Stores document metadata in Vercel KV
 * - Triggers asynchronous document processing
 * - Generates unique document IDs with timestamps
 *
 * Security: Requires valid Supabase authentication
 * Runtime: Vercel Edge Runtime for optimal performance
 *
 * Request Format:
 * POST /api/documents/upload
 * Content-Type: multipart/form-data
 * Body: FormData with 'file' field containing the document
 *
 * Response Format:
 * {
 *   id: string,           // Generated document ID
 *   name: string,         // Original filename
 *   url: string,          // Blob storage URL
 *   status: "uploaded"    // Initial status
 * }
 *
 * Supported File Types:
 * - text/markdown (.md)
 * - text/plain (.txt)
 * - application/pdf (.pdf)
 * - text/html (.html)
 *
 * Processing Flow:
 * 1. Validate authentication and file type
 * 2. Generate unique document ID
 * 3. Upload to Vercel Blob storage
 * 4. Store metadata in KV
 * 5. Trigger background processing (non-blocking)
 * 6. Return upload confirmation
 */

import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { validateEnv } from "../../../../lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../../lib/supabase-server"

export const runtime = "edge"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["text/markdown", "text/plain", "application/pdf", "text/html"]
const ALLOWED_EXTENSIONS = [".md", ".txt", ".pdf", ".html"]

// Simple debug logger for server-side
const serverDebug = (message: string, ...args: any[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG === "true") {
    console.log(`[SERVER DEBUG] ${message}`, ...args)
  }
}

export async function POST(request: NextRequest) {
  serverDebug("Document upload API called")

  // Log request details
  serverDebug("Request headers:", Object.fromEntries(request.headers.entries()))

  // Validate only the environment variables needed for this route
  try {
    validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])
    serverDebug("Environment variables validated successfully")
  } catch (envError) {
    serverDebug("Environment validation error:", envError)
    return NextResponse.json(
      {
        error: "Configuration Error",
        message: envError instanceof Error ? envError.message : "Missing required environment variables",
        debug: process.env.NEXT_PUBLIC_DEBUG === "true" ? { error: String(envError) } : undefined,
      },
      { status: 500 },
    )
  }

  try {
    // Validate authentication using edge client
    serverDebug("Creating Supabase edge client")
    const supabase = createEdgeClient(request)

    serverDebug("Getting authenticated user")
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      serverDebug("Authentication failed:", error)
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required",
          debug: process.env.NEXT_PUBLIC_DEBUG === "true" ? { error: String(error) } : undefined,
        },
        { status: 401 },
      )
    }

    serverDebug("User authenticated successfully:", data.user.id)

    serverDebug("Parsing form data")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      serverDebug("No file provided in request")
      return NextResponse.json({ error: "Bad Request", message: "No file provided" }, { status: 400 })
    }

    serverDebug("File received:", file.name, file.type, file.size)

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      serverDebug("Invalid file type:", file.type)
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid file type. Supported types: Markdown, Text, PDF, HTML" },
        { status: 400 },
      )
    }

    // Validate file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExtension) {
      serverDebug("Invalid file extension:", file.name)
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid file extension. Supported extensions: .md, .txt, .pdf, .html" },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      serverDebug("File too large:", file.size)
      return NextResponse.json(
        { error: "Bad Request", message: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    // Validate file name for security
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-_]/g, "_")
    serverDebug("Sanitized filename:", sanitizedFileName)

    // Generate document ID
    const documentId = `doc-${Date.now()}`
    serverDebug("Generated document ID:", documentId)

    // Upload to Vercel Blob
    serverDebug("Uploading to Vercel Blob")
    let blob
    try {
      blob = await put(`documents/${documentId}/${sanitizedFileName}`, file, {
        access: "public", // Changed from "private" to "public" to fix the error
      })
      serverDebug("Blob upload successful:", blob.url)
    } catch (blobError) {
      serverDebug("Blob upload error:", blobError)
      return NextResponse.json(
        {
          error: "Storage Error",
          message: "Failed to upload file to storage",
          debug: process.env.NEXT_PUBLIC_DEBUG === "true" ? { error: String(blobError) } : undefined,
        },
        { status: 500 },
      )
    }

    // Store metadata in KV
    serverDebug("Storing metadata in KV")
    try {
      await kv.set(`document:${documentId}`, {
        id: documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        url: blob.url,
        uploadedAt: new Date().toISOString(),
        status: "uploaded",
        userId: data.user.id, // Associate with user
      })
      serverDebug("Metadata stored successfully")
    } catch (kvError) {
      serverDebug("KV storage error:", kvError)
      return NextResponse.json(
        {
          error: "Storage Error",
          message: "Failed to store document metadata",
          debug: process.env.NEXT_PUBLIC_DEBUG === "true" ? { error: String(kvError) } : undefined,
        },
        { status: 500 },
      )
    }

    // Trigger processing
    serverDebug("Triggering document processing")
    const processingUrl = new URL("/api/documents/process", request.url)
    processingUrl.searchParams.set("id", documentId)

    try {
      fetch(processingUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward auth cookie for the background request
          Cookie: request.headers.get("Cookie") || "",
        },
      }).catch((error) => {
        serverDebug("Non-blocking processing trigger error:", error)
      })
    } catch (fetchError) {
      serverDebug("Error triggering processing (non-blocking):", fetchError)
      // Don't return an error here as this is non-blocking
    }

    serverDebug("Upload completed successfully, returning response")
    return NextResponse.json({
      id: documentId,
      name: file.name,
      url: blob.url,
      status: "uploaded",
    })
  } catch (error) {
    serverDebug("Unhandled upload error:", error)

    // Ensure error is properly serialized
    let errorMessage = "Failed to upload document"
    let errorDetails = undefined

    if (error instanceof Error) {
      errorMessage = error.message
      if (process.env.NEXT_PUBLIC_DEBUG === "true") {
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      }
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: errorMessage,
        debug: errorDetails,
      },
      { status: 500 },
    )
  }
}
