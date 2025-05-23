// app/api/documents/upload/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { kv } from "@vercel/kv"
import { validateEnv } from "../../../../lib/utils/env"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { withErrorTracking, createRequestContext } from "../../../../lib/middleware/error-tracking"

export const runtime = "edge"

async function uploadHandler(request: NextRequest) {
  const context = createRequestContext(request)

  validateEnv(["SUPABASE", "VERCEL_BLOB", "VERCEL_KV"])

  const supabase = createEdgeClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error("Unauthorized: Authentication required")
  }

  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file) {
    throw new Error("Bad Request: No file provided")
  }

  const allowedTypes = ["text/markdown", "text/plain", "application/pdf", "text/html"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Supported types: Markdown, Text, PDF, HTML`)
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error(`File too large: ${file.size} bytes. Maximum size: ${maxSize} bytes`)
  }

  const documentId = `doc-${Date.now()}`
  const blob = await put(`documents/${documentId}/${file.name}`, file, {
    access: "public",
  })

  const metadata = {
    id: documentId,
    name: file.name,
    type: file.type,
    size: file.size,
    url: blob.url,
    uploadedAt: new Date().toISOString(),
    status: "uploaded",
    uploadedBy: data.user.id,
  }

  await kv.set(`document:${documentId}`, metadata)

  return NextResponse.json(
    {
      id: documentId,
      name: file.name,
      url: blob.url,
      status: "uploaded",
    },
    {
      headers: {
        "x-request-id": context.requestId || "unknown",
      },
    },
  )
}

export const POST = withErrorTracking(uploadHandler)
