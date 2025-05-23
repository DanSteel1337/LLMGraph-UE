"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import { useToast } from "../../../components/ui/use-toast"
import { DocumentCard } from "./document-card"
import { Loader2 } from "lucide-react"

export interface Document {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
  status: "uploaded" | "processing" | "processed" | "error" | "completed" | string
  error?: string
  chunkCount?: number
  vectorCount?: number
  processingStartedAt?: string
  processingCompletedAt?: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents: initialDocuments }: DocumentListProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [localDocuments, setLocalDocuments] = useState<Document[]>(initialDocuments)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Poll for document status updates
  useEffect(() => {
    if (!localDocuments.some((doc) => doc.status === "processing" || doc.status === "uploaded")) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/documents", {
          credentials: "include",
        })

        if (response.ok) {
          const updatedDocuments = await response.json()
          setLocalDocuments(updatedDocuments)

          // Stop polling if no documents are still processing
          if (!updatedDocuments.some((doc) => doc.status === "processing" || doc.status === "uploaded")) {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error("Error polling document status:", error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [localDocuments])

  const handleDelete = async () => {
    if (!selectedDocument) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/documents?id=${selectedDocument.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      // Remove document from local state
      setLocalDocuments((prev) => prev.filter((doc) => doc.id !== selectedDocument.id))

      toast({
        title: "Document deleted",
        description: `${selectedDocument.name} has been deleted.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setSelectedDocument(null)
    }
  }

  const handleRefresh = async (docId: string) => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/documents/process?id=${docId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to refresh document processing")
      }

      toast({
        title: "Processing started",
        description: "Document processing has been restarted.",
      })

      // Update document status locally
      setLocalDocuments((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, status: "processing" } : doc)))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh document",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  if (localDocuments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-center text-muted-foreground">No documents found. Upload a document to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Refreshing documents...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localDocuments.map((document) => (
          <DocumentCard
            key={document.id}
            id={document.id}
            title={document.name}
            description={`${document.type} • ${(document.size / 1024 / 1024).toFixed(2)} MB`}
            createdAt={new Date(document.uploadedAt)}
            status={
              document.status === "processed" || document.status === "completed"
                ? "indexed"
                : document.status === "error"
                  ? "error"
                  : "processing"
            }
            chunks={document.chunkCount || 0}
            onDelete={() => setSelectedDocument(document)}
            onRefresh={() => handleRefresh(document.id)}
          />
        ))}
      </div>

      <AlertDialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document and all associated vectors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
