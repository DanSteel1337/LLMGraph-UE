"use client"

import { useState } from "react"
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

interface Document {
  id: string
  name: string
  url: string
  type: string
  size: number
  createdAt: string
  status?: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [localDocuments, setLocalDocuments] = useState<Document[]>(documents)
  const { toast } = useToast()

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
      {localDocuments.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onDelete={() => setSelectedDocument(document)}
          status={document.status}
        />
      ))}

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
