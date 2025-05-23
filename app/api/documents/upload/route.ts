/**
 * Document Upload API Route
 * 
 * Purpose: Handles file uploads to Vercel Blob storage and initiates document processing
 * 
 * Features:
 * - Validates file types (Markdown, Text, PDF, HTML)
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
import { validateEnv } from "@/lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "@/lib/supabase-server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  // Validate only the environment variables needed for this route
  validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])

  try {
    // Validate authentication using edge client
    const supabase = createEdgeClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["text/markdown", "text/plain", "application/pdf", "text/html"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: Markdown, Text, PDF, HTML" },
        { status: 400 },
      )
    }

    // Upload to Vercel Blob
    const documentId = `doc-${Date.now()}`
    const blob = await put(`documents/${documentId}/${file.name}`, file, {
      access: "private",
    })

    // Store metadata in KV
    await kv.set(`document:${documentId}`, {
      id: documentId,
      name: file.name,
      type: file.type,
      size: file.size,
      url: blob.url,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
    })

    // Trigger processing
    const processingUrl = new URL("/api/documents/process", request.url)
    processingUrl.searchParams.set("id", documentId)

    fetch(processingUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(console.error) // Non-blocking

    return NextResponse.json({
      id: documentId,
      name: file.name,
      url: blob.url,
      status: "uploaded",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
