"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { CustomBadge } from "../ui/custom-badge"
import { FileText, Trash2, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DocumentCardProps {
  id: string
  title: string
  description?: string
  createdAt: Date
  status: "processing" | "indexed" | "error"
  chunks?: number
  onDelete?: (id: string) => Promise<void>
  onRefresh?: (id: string) => Promise<void>
}

export function DocumentCard({
  id,
  title,
  description,
  createdAt,
  status,
  chunks = 0,
  onDelete,
  onRefresh,
}: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return

    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setIsDeleting(true)
      try {
        await onDelete(id)
      } catch (error) {
        console.error("Error deleting document:", error)
        alert("Failed to delete document. Please try again.")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh) return

    setIsRefreshing(true)
    try {
      await onRefresh(id)
    } catch (error) {
      console.error("Error refreshing document:", error)
      alert("Failed to refresh document. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">{title}</CardTitle>
            <CardDescription>Added {formatDistanceToNow(createdAt, { addSuffix: true })}</CardDescription>
          </div>
          <CustomBadge variant={status === "indexed" ? "success" : status === "processing" ? "warning" : "destructive"}>
            {status === "indexed" ? "Indexed" : status === "processing" ? "Processing" : "Error"}
          </CustomBadge>
        </div>
      </CardHeader>
      <CardContent>
        {description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>}
        <div className="flex items-center text-xs text-muted-foreground">
          <FileText className="mr-1 h-3 w-3" />
          <span>{chunks} chunks</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isDeleting || !onRefresh}>
          {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting || isRefreshing || !onDelete}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}
