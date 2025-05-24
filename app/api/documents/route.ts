import { requireAuth } from "../../../lib/auth"
import { getDocuments, deleteDocument } from "../../../lib/documents/storage"

export const runtime = "edge"

export async function GET() {
  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    const documents = await getDocuments()
    return Response.json({ documents })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
    console.error("Documents GET error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")

    if (!documentId) {
      return Response.json({ error: "Document ID is required" }, { status: 400 })
    }

    await deleteDocument(documentId)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
    
    console.error("Documents DELETE error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
