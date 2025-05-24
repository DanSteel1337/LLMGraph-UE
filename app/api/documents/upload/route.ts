import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { requireAuth } from "../../../../lib/auth"

export const runtime = "edge"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["text/markdown", "text/plain", "application/pdf", "text/html"]
const ALLOWED_EXTENSIONS = [".md", ".txt", ".pdf", ".html"]

export async function POST(request: NextRequest) {
  try {
    // Single source of truth auth validation
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: Markdown, Text, PDF, HTML" },
        { status: 400 },
      )
    }

    // Validate file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file extension. Supported extensions: .md, .txt, .pdf, .html" },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    // Generate document ID and sanitize filename
    const documentId = `doc-${Date.now()}`
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-_]/g, "_")

    // Upload to Vercel Blob
    const blobResult = await put(`documents/${documentId}/${sanitizedFileName}`, file, {
      access: "public",
      addRandomSuffix: false,
    })

    // Store metadata in Vercel KV
    await kv.set(`document:${documentId}`, {
      id: documentId,
      name: file.name,
      filename: file.name,
      type: file.type,
      size: file.size,
      url: blobResult.downloadUrl,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
      userId: user.id,
    })

    return NextResponse.json({
      id: documentId,
      name: file.name,
      url: blobResult.downloadUrl,
      status: "uploaded",
    })
  } catch (error) {
    console.error("Upload error:", error)

    // Check if this is an auth error
    if (error instanceof Error && error.message.includes("Authentication")) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
