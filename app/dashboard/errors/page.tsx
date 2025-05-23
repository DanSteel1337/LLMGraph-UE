"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, RefreshCw, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"
import SourceMapViewer from "@/app/components/debug/source-map-viewer"

interface ErrorReport {
  errorId: string
  message: string
  name: string
  stack?: string
  timestamp: string
  context?: {
    url?: string
    userAgent?: string
    userId?: string
    requestId?: string
  }
}

function ErrorsPageContent() {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const { toast } = useToast()
  const { handleError } = useErrorBoundaryWithToast()

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/errors")

      if (!response.ok) {
        throw new Error(`Failed to fetch errors: ${response.status}`)
      }

      const data = await response.json()
      setErrors(data.errors || [])
    } catch (error) {
      handleError(error instanceof Error ? error : new Error("Failed to fetch errors"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
  }, [])

  const filteredErrors = errors.filter((error) => {
    const matchesSearch =
      searchTerm === "" ||
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterType === "all" || error.name === filterType

    return matchesSearch && matchesFilter
  })

  const errorTypes = Array.from(new Set(errors.map((error) => error.name)))

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getErrorSeverity = (errorName: string) => {
    if (errorName.includes("TypeError") || errorName.includes("ReferenceError")) {
      return "high"
    }
    if (errorName.includes("NetworkError") || errorName.includes("FetchError")) {
      return "medium"
    }
    return "low"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Reports</h1>
          <p className="text-muted-foreground">Monitor and debug application errors with source map support</p>
        </div>
        <Button onClick={fetchErrors} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter">Error Type</Label>
              <select
                id="filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Types</option>
                {errorTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Error List</TabsTrigger>
          <TabsTrigger value="details">Error Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredErrors.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {loading ? "Loading errors..." : "No errors found matching your criteria."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {filteredErrors.map((error) => {
                const severity = getErrorSeverity(error.name)
                return (
                  <Card
                    key={error.errorId}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedError?.errorId === error.errorId ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedError(error)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(severity)}>{severity.toUpperCase()}</Badge>
                            <Badge variant="outline">{error.name}</Badge>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(error.timestamp)}</span>
                          </div>
                          <p className="text-sm font-medium">{error.message}</p>
                          {error.context?.url && (
                            <p className="text-xs text-muted-foreground truncate">{error.context.url}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          {selectedError ? (
            <SourceMapViewer
              error={{
                message: selectedError.message,
                name: selectedError.name,
                stack: selectedError.stack,
                timestamp: selectedError.timestamp,
                requestId: selectedError.context?.requestId,
                url: selectedError.context?.url,
                userAgent: selectedError.context?.userAgent,
              }}
              showSourceMaps={true}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Select an error from the list to view detailed information.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ErrorsPage() {
  const { handleError } = useErrorBoundaryWithToast()

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
      showSourceMaps={true}
      fallback={
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Dashboard Error</h3>
          <p className="text-muted-foreground text-center mb-6">
            An error occurred while loading the error dashboard. Please try again or refresh the page.
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>
      }
    >
      <ErrorsPageContent />
    </ErrorBoundary>
  )
}
