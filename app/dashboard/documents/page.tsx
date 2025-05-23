/**
 * Purpose: Document management page
 * Logic:
 * - Displays list of uploaded documents
 * - Provides document upload functionality
 * - Shows document processing status
 * Runtime context: Server Component
 * Services: Vercel Blob (for document list), Vercel KV (for processing status)
 */
import { DocumentList } from "@/app/components/documents/document-list"
import { UploadForm } from "@/app/components/documents/upload-form"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDocuments } from "@/lib/documents/storage"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function DocumentsPage() {
  let documents = []
  let error = null

  try {
    documents = await getDocuments()
  } catch (err) {
    console.error("Failed to fetch documents:", err)
    error = "Failed to load documents. Please try refreshing the page."
  }

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>Document Management</CardTitle>
          <CardDescription>Upload and manage your API documentation</CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4">
          <DocumentList documents={documents} />
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <UploadForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
