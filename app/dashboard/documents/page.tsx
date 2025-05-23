import { CardFooter } from "@/components/ui/card"
/**
 * Purpose: Document management page
 * Logic:
 * - Displays list of uploaded documents
 * - Provides document upload functionality
 * - Shows document processing status
 * Runtime context: Server Component
 * Services: Vercel Blob (for document list), Vercel KV (for processing status)
 */
import { Suspense } from "react"
import { DocumentList } from "../../components/documents/document-list"
import { UploadForm } from "../../components/documents/upload-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { getDocuments } from "../../../lib/documents/storage"
import { Skeleton } from "../../../components/ui/skeleton"

// Loading component for documents
function DocumentsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
    </div>
  )
}

// Documents list with data
async function DocumentsList() {
  const documents = await getDocuments()
  return <DocumentList documents={documents} />
}

export default async function DocumentsPage() {
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
          <Suspense fallback={<DocumentsLoading />}>
            <DocumentsList />
          </Suspense>
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <UploadForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
