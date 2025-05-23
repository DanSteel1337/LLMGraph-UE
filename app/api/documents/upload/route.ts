import { type NextRequest, NextResponse } from "next/server"
import { validateEnv } from "../../../../lib/utils/env"
import { kv } from "@vercel/kv"
import { createEdgeClient } from "../../../../lib/supabase-server"

validateEnv()

export const config = {
  runtime: "edge",
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createEdgeClient(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.error()
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.error()
    }

    const filename = `${user.id}/${file.name}`

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage.from("documents").upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("uploadError", uploadError)
      return NextResponse.error()
    }

    const documentId = uploadData.path.split("/").pop()?.split(".")[0]

    if (!documentId) {
      console.error("Failed to extract document ID from path")
      return NextResponse.error()
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path)

    // Store in KV
    await kv.set(documentId, {
      userId: user.id,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: uploadData.path,
      publicUrl: publicUrlData.publicUrl,
      status: "processing",
    })

    // Construct processing URL
    const processingUrl = new URL(`${request.headers.get("origin")}/api/documents/process`)
    processingUrl.searchParams.set("documentId", documentId)

    // Trigger processing in background (non-blocking)
    fetch(processingUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward all cookies for authentication
        Cookie: request.headers.get("cookie") || "",
      },
    }).catch((error) => {
      console.error("Failed to trigger processing:", error)
    })

    return NextResponse.json({
      documentId,
    })
  } catch (e: any) {
    console.error("Upload error", e)
    return NextResponse.error()
  }
}
