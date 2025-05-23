"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CustomBadge } from "@/app/components/ui/custom-badge"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"

export function DebugPanel() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { handleError } = useErrorBoundaryWithToast()

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to run diagnostics")
      }

      const data = await response.json()
      setResults(data)

      // Check for any errors in the results
      const hasErrors = Object.values(data.tests).some((test: any) => test.status === "error")

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
      handleError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>System Diagnostics</CardTitle>
            <CardDescription>An error occurred while rendering the debug panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>The debug panel encountered an error. Please try refreshing the page.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </CardFooter>
        </Card>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Test and debug system components</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium">Timestamp:</span> {results.timestamp}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Environment:</span> {results.environment}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Runtime:</span> {results.runtime}
                </div>
              </div>

              <Tabs defaultValue="pinecone">
                <TabsList>
                  <TabsTrigger value="pinecone">
                    Pinecone
                    {results.tests.pinecone.status === "success" ? (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="ml-2 h-4 w-4 text-red-500" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="openai">
                    OpenAI
                    {results.tests.openai.status === "success" ? (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="ml-2 h-4 w-4 text-red-500" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="kv">
                    Vercel KV
                    {results.tests.kv.status === "success" ? (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="ml-2 h-4 w-4 text-red-500" />
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pinecone" className="mt-4">
                  <TestResultCard
                    title="Pinecone Vector Database"
                    status={results.tests.pinecone.status}
                    latency={results.tests.pinecone.latency}
                    data={results.tests.pinecone}
                  />
                </TabsContent>

                <TabsContent value="openai" className="mt-4">
                  <TestResultCard
                    title="OpenAI Embeddings"
                    status={results.tests.openai.status}
                    latency={results.tests.openai.latency}
                    data={results.tests.openai}
                  />
                </TabsContent>

                <TabsContent value="kv" className="mt-4">
                  <TestResultCard
                    title="Vercel KV Storage"
                    status={results.tests.kv.status}
                    latency={results.tests.kv.latency}
                    data={results.tests.kv}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </ErrorBoundary>
  )
}

interface TestResultCardProps {
  title: string
  status: "success" | "error"
  latency?: number
  data: any
}

function TestResultCard({ title, status, latency, data }: TestResultCardProps) {
  // Function to sanitize host by removing protocol
  const sanitizeHost = (host: string | undefined) => {
    return host ? host.replace(/^(https?:\/\/)/, "") : "Not set"
  }

  // Extract Pinecone configuration if this is the Pinecone test
  const isPineconeTest = title.toLowerCase().includes("pinecone")
  const pineconeConfig = isPineconeTest
    ? {
        host: sanitizeHost(process.env.PINECONE_HOST),
        indexName: process.env.PINECONE_INDEX_NAME || "Not set",
        apiKeySet: !!process.env.PINECONE_API_KEY,
      }
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <CustomBadge variant={status === "success" ? "success" : "destructive"}>
            {status === "success" ? "Success" : "Error"}
          </CustomBadge>
        </div>
        {latency && <CardDescription>Latency: {latency}ms</CardDescription>}
        {isPineconeTest && (
          <CardDescription className="mt-2">
            <div className="text-xs text-muted-foreground">
              <div>Host: {pineconeConfig?.host}</div>
              <div>Index: {pineconeConfig?.indexName}</div>
              <div>API Key: {pineconeConfig?.apiKeySet ? "Set" : "Not set"}</div>
            </div>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {status === "error" ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{data.message}</AlertDescription>
            {data.stack && <pre className="mt-2 text-xs overflow-auto p-2 bg-destructive/10 rounded">{data.stack}</pre>}
          </Alert>
        ) : (
          <pre className="text-xs overflow-auto p-4 bg-muted rounded-md">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  )
}
