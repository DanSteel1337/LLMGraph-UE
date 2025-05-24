import { validateAuth, unauthorizedResponse } from "../../../lib/auth"
import { getDocuments, deleteDocument } from "../../../lib/documents/storage"

export const runtime = "edge"

export async function GET() {
  try {
    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

    const documents = await getDocuments()
    return Response.json({ documents })
  } catch (error) {
    console.error("Documents GET error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    // Single source of truth auth validation
    const { user, error } = await validateAuth()
    if (error) return unauthorizedResponse()

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
