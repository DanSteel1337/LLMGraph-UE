/**
 * Purpose: Document management page
 * Logic:
 * - Displays list of uploaded documents
 * - Provides document upload functionality
 * - Shows document processing status
 * Runtime context: Server Component
 * Services: Vercel Blob (for document list), Vercel KV (for processing status)
 */
import { DocumentList } from "../../components/documents/document-list"
import { UploadForm } from "../../components/documents/upload-form"
import { Card, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { getDocuments } from "../../../lib/documents/storage"

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>Document Management</CardTitle>
          <CardDescription>Upload and manage your API documentation</CardDescription>
        </CardHeader>
      </Card>

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
