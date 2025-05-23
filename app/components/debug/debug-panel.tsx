"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, RefreshCw, Bug, Activity } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"
import SourceMapViewer from "@/app/components/debug/source-map-viewer"

interface DebugResults {
  timestamp: string
  environment: string
  runtime: string
  tests: Record<string, any>
  metadata?: {
    requestId?: string
    duration?: string
  }
}

function DebugPanelContent() {
  const [results, setResults] = useState<DebugResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testError, setTestError] = useState<any>(null)
  const { toast } = useToast()
  const { handleError } = useErrorBoundaryWithToast()

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setTestError(null)

    try {
      const response = await fetch("/api/debug")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to run diagnostics`)
      }

      const data = await response.json()
      setResults(data)

      // Check for any errors in the results
      const hasErrors = Object.values(data.tests || {}).some((test: any) => test.status === "error")

      if (hasErrors) {
        toast({
          title: "Diagnostics completed with errors",
          description: "Some tests failed. Check the results for details.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Diagnostics completed successfully",
          description: "All tests passed.",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)
      setTestError(err instanceof Error ? err : new Error(errorMessage))
      handleError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const runHealthCheck = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/health")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Health check failed`)
      }

      const data = await response.json()

      // Convert health check data to debug results format
      const healthResults: DebugResults = {
        timestamp: data.metadata?.timestamp || new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        runtime: "edge",
        tests: {
          api: data.api,
          pinecone: data.pinecone,
          supabase: data.supabase,
          kv: data.kv,
        },
        metadata: data.metadata,
      }

      setResults(healthResults)

      const hasErrors = Object.values(healthResults.tests).some((test: any) => test.status === "error")

      if (hasErrors) {
        toast({
          title: "Health check completed with errors",
          description: "Some services are not healthy.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Health check completed successfully",
          description: "All services are healthy.",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Health check failed"
      setError(errorMessage)
      setTestError(err instanceof Error ? err : new Error(errorMessage))
      handleError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
      case "failed":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            System Diagnostics
          </CardTitle>
          <p className="text-sm text-muted-foreground">Test and debug system components with enhanced error tracking</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Run Full Diagnostics
            </Button>
            <Button onClick={runHealthCheck} disabled={loading} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Quick Health Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {testError && (
        <SourceMapViewer
          error={{
            message: testError.message,
            name: testError.name,
            stack: testError.stack,
            timestamp: new Date().toISOString(),
            requestId: results?.metadata?.requestId,
          }}
          showSourceMaps={true}
        />
      )}

      {results && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Results</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(results.tests).map(([testName, testResult]: [string, any]) => (
                <Card key={testName}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium capitalize">{testName}</h3>
                      <Badge className={getStatusColor(testResult.status || "unknown")}>
                        {testResult.status || "unknown"}
                      </Badge>
                    </div>
                    {testResult.message && <p className="text-xs text-muted-foreground mt-2">{testResult.message}</p>}
                    {testResult.latency && (
                      <p className="text-xs text-muted-foreground mt-1">Latency: {testResult.latency}ms</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {Object.entries(results.tests).map(([testName, testResult]: [string, any]) => (
              <Card key={testName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">{testName}</CardTitle>
                    <Badge className={getStatusColor(testResult.status || "unknown")}>
                      {testResult.status || "unknown"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <span className="ml-2">{new Date(results.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Environment:</span>
                    <span className="ml-2">{results.environment}</span>
                  </div>
                  <div>
                    <span className="font-medium">Runtime:</span>
                    <span className="ml-2">{results.runtime}</span>
                  </div>
                  {results.metadata?.requestId && (
                    <div>
                      <span className="font-medium">Request ID:</span>
                      <span className="ml-2 font-mono text-xs">{results.metadata.requestId}</span>
                    </div>
                  )}
                  {results.metadata?.duration && (
                    <div>
                      <span className="font-medium">Duration:</span>
                      <span className="ml-2">{results.metadata.duration}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export function DebugPanel() {
  const { handleError } = useErrorBoundaryWithToast()

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
      showSourceMaps={true}
      fallback={
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Debug Panel Error</h3>
          <p className="text-muted-foreground text-center mb-6">
            An error occurred in the debug panel. Please try again or refresh the page.
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>
      }
    >
      <DebugPanelContent />
    </ErrorBoundary>
  )
}

// Keep the default export for backward compatibility
export default DebugPanel
