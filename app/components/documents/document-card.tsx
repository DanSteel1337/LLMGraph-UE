"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { CustomBadge } from "../ui/custom-badge"
import { FileText, Trash2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip"

interface DocumentCardProps {
  id: string
  title: string
  description?: string
  createdAt: Date | string
  status: "processing" | "indexed" | "error"
  chunks?: number
  onDelete?: (id: string) => void
  onRefresh?: (id: string) => void
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
    setIsDeleting(true)
    try {
      onDelete(id)
    } catch (error) {
      console.error("Error deleting document:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      onRefresh(id)
    } catch (error) {
      console.error("Error refreshing document:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "indexed":
        return <CheckCircle className="h-4 w-4" />
      case "processing":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Format the date safely
  const formatDate = (dateValue: Date | string) => {
    try {
      // Handle string dates or invalid dates
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue)

      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return "Unknown date"
      }

      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Unknown date"
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">{title}</CardTitle>
            <CardDescription>Added {formatDate(createdAt)}</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <CustomBadge
                    variant={status === "indexed" ? "success" : status === "processing" ? "warning" : "destructive"}
                  >
                    {getStatusIcon()}
                    <span className="ml-1">
                      {status === "indexed" ? "Indexed" : status === "processing" ? "Processing" : "Error"}
                    </span>
                  </CustomBadge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {status === "indexed"
                  ? "Document has been processed and indexed"
                  : status === "processing"
                    ? "Document is being processed"
                    : "Error processing document"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
