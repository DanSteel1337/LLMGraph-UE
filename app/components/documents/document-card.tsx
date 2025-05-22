/**
 * Purpose: Document card component
 * Logic:
 * - Displays document information
 * - Shows processing status
 * - Provides delete functionality
 * Runtime context: Client Component
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, FileText, AlertCircle } from "lucide-react"
import { useToast } from "@/app/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { formatBytes, formatDate } from "@/lib/utils"

interface DocumentCardProps {
  document: {
    id: string
    name: string
    type: string
    size: number
    uploadedAt: string
    status: "uploaded" | "processing" | "processed" | "error"
    error?: string
    chunkCount?: number
    vectorCount?: number
  }
}

export function DocumentCard({ document }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${document.name}?`)) {
      setIsDeleting(true)

      try {
        const response = await fetch(`/api/documents?id=${document.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete document")
        }

        toast({
          title: "Document deleted",
          description: `${document.name} has been deleted.`,
        })

        router.refresh()
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete document",
          variant: "destructive",
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const getStatusBadge = () => {
    switch (document.status) {
      case "uploaded":
        return <Badge variant="outline">Uploaded</Badge>
      case "processing":
        return <Badge variant="secondary">Processing</Badge>
      case "processed":
        return <Badge variant="success">Processed</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base truncate">{document.name}</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{document.type}</span>
          </div>
          <div>Size: {formatBytes(document.size)}</div>
          <div>Uploaded: {formatDate(document.uploadedAt)}</div>

          {document.status === "processed" && (
            <>
              <div>Chunks: {document.chunkCount}</div>
              <div>Vectors: {document.vectorCount}</div>
            </>
          )}

          {document.status === "error" && document.error && (
            <div className="flex items-start gap-2 text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{document.error}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  )
}
