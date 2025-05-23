import { validateEnv } from "../../../../lib/utils/env"
import { kv } from "@vercel/kv"
import { processDocumentWithProgress } from "../../../../lib/documents/processor"
import { getDocument } from "../../../../lib/documents/storage"
import { createEdgeClient } from "../../../../lib/supabase-server"
import { NextResponse } from "next/server"

export const runtime = "edge"

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined")
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { documentId } = await req.json()

    if (!documentId) {
      return new NextResponse("Missing documentId", { status: 400 })
    }

    validateEnv()

    const supabase = createEdgeClient()

    const { data: document, error } = await getDocument(supabase, documentId)

    if (error) {
      console.error("Error fetching document:", error)
      return new NextResponse("Error fetching document", { status: 500 })
    }

    if (!document) {
      return new NextResponse("Document not found", { status: 404 })
    }

    if (document.status === "processing") {
      return new NextResponse("Document is already processing", { status: 400 })
    }

    // Optimistically set the document status to processing
    await kv.set(`document:${documentId}:status`, "processing")

    // Start processing the document
    processDocumentWithProgress(documentId)
      .then(async () => {
        console.log(`Document ${documentId} processing completed successfully.`)
        await kv.set(`document:${documentId}:status`, "completed")
      })
      .catch(async (error) => {
        console.error(`Error processing document ${documentId}:`, error.message)
        await kv.set(`document:${documentId}:status`, "failed")
      })

    return new NextResponse(JSON.stringify({ message: "Document processing started." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    console.error("Error in /api/documents/process:", e)
    return new NextResponse(JSON.stringify({ message: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
