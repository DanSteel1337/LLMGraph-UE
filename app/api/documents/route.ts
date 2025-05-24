import { createEdgeClient } from "../../../lib/supabase-server"
import { getDocuments, deleteDocument } from "../../../lib/documents/storage"

export const runtime = "edge"

export async function GET() {
  try {
    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await getDocuments()
    return Response.json({ documents })
  } catch (error) {
    console.error("Documents GET error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    // Simple auth check for single-user access
    const supabase = createEdgeClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return Response.json({ error: "Document ID is required" }, { status: 400 })
    }

    await deleteDocument(documentId)
    return Response.json({ success: true })
  } catch (error) {
    console.error("Documents DELETE error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
