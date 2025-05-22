/**
 * Purpose: Document list component
 * Logic:
 * - Renders a grid of document cards
 * - Handles empty state
 * Runtime context: Client Component
 */
"use client"

import { DocumentCard } from "./document-card"
import { FileQuestion } from "lucide-react"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface DocumentListProps {
  documents: Array<{
    id: string
    name: string
    type: string
    size: number
    uploadedAt: string
    status: "uploaded" | "processing" | "processed" | "error"
    error?: string
    chunkCount?: number
    vectorCount?: number
  }>
}

// Separate the document list content into its own component to be wrapped by ErrorBoundary
function DocumentListContent({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No documents found</h3>
        <p className="text-sm text-muted-foreground mt-1">Upload your first document to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  )
}

// Main DocumentList component that includes the ErrorBoundary
export function DocumentList({ documents }: DocumentListProps) {
  const { handleError } = useErrorBoundaryWithToast()

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
      fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium">Error loading documents</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            There was a problem loading your documents. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>
      }
    >
      <DocumentListContent documents={documents} />
    </ErrorBoundary>
  )
}
