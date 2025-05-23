/**
 * Document Card Component
 * 
 * Purpose: Display individual document information with processing status
 * 
 * Features:
 * - Shows document metadata (name, size, upload date)
 * - Displays processing status with progress indicators
 * - Provides delete functionality with confirmation
 * - Shows processing time and chunk/vector counts
 * - Enhanced error display with tooltips
 * 
 * Used in: Document list view
 * Services: Interacts with /api/documents for deletion
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CustomBadge } from "@/app/components/ui/custom-badge"
import { Trash2, FileText, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { formatBytes, formatDate } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    processingStartedAt?: string
    processingCompletedAt?: string
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
        return <CustomBadge variant="outline">Uploaded</CustomBadge>
      case "processing":
        return <CustomBadge variant="secondary">Processing</CustomBadge>
      case "processed":
        return <CustomBadge variant="success">Processed</CustomBadge>
      case "error":
        return <CustomBadge variant="destructive">Error</CustomBadge>
      default:
        return null
    }
  }

  // Calculate processing time if available
  const getProcessingTime = () => {
    if (document.processingStartedAt && document.processingCompletedAt) {
      const start = new Date(document.processingStartedAt).getTime()
      const end = new Date(document.processingCompletedAt).getTime()
      const durationMs = end - start

      // Format duration nicely
      if (durationMs < 1000) {
        return `${durationMs}ms`
      } else if (durationMs < 60000) {
        return `${(durationMs / 1000).toFixed(1)}s`
      } else {
        const minutes = Math.floor(durationMs / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)
        return `${minutes}m ${seconds}s`
      }
    }
    return null
  }

  const processingTime = getProcessingTime()

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
              <div className="flex items-center gap-1">
                <span>Chunks: {document.chunkCount}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Semantic chunks created from the document</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-1">
                <span>Vectors: {document.vectorCount}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vector embeddings stored in Pinecone</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {processingTime && (
                <div className="flex items-center gap-1">
                  <span>Processing time: {processingTime}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total time to process the document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
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
