"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Separator } from "../../../components/ui/separator"
import { CustomBadge } from "../ui/custom-badge"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

interface DebugPanelProps {
  initialTab?: string
}

export function DebugPanel({ initialTab = "health" }: DebugPanelProps) {
  const [healthStatus, setHealthStatus] = useState<Record<string, { status: "ok" | "error"; message?: string }>>({})
  const [isLoading, setIsLoading] = useState(false)

  const checkHealth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`)
      }

      const data = await response.json()
      setHealthStatus(data.services || {})
    } catch (error) {
      console.error("Health check error:", error)
      setHealthStatus({
        api: { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkDocumentProcessing = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/health/document-processing", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Document processing check failed with status: ${response.status}`)
      }

      const data = await response.json()
      setHealthStatus((prev) => ({
        ...prev,
        documentProcessing:
          data.status === "ok"
            ? { status: "ok" }
            : { status: "error", message: data.message || "Document processing check failed" },
      }))
    } catch (error) {
      console.error("Document processing check error:", error)
      setHealthStatus((prev) => ({
        ...prev,
        documentProcessing: {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>System Debug Panel</CardTitle>
        <CardDescription>Test and debug system components</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={initialTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health">Health Checks</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">System Health</h3>
                <Button variant="outline" size="sm" onClick={checkHealth} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Check Health
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {Object.keys(healthStatus).length > 0 ? (
                  Object.entries(healthStatus).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        {status.status === "ok" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-medium capitalize">{service}</span>
                      </div>
                      <CustomBadge variant={status.status === "ok" ? "success" : "destructive"}>
                        {status.status === "ok" ? "Healthy" : "Error"}
                      </CustomBadge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">Run health checks to see results</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">Document Processing</h3>
                <Button variant="outline" size="sm" onClick={checkDocumentProcessing} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Test Processing
                </Button>
              </div>

              <Separator />

              {healthStatus.documentProcessing ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    {healthStatus.documentProcessing.status === "ok" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">Document Processing Pipeline</span>
                  </div>
                  <CustomBadge variant={healthStatus.documentProcessing.status === "ok" ? "success" : "destructive"}>
                    {healthStatus.documentProcessing.status === "ok" ? "Working" : "Failed"}
                  </CustomBadge>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Run document processing test to see results
                </div>
              )}

              {healthStatus.documentProcessing?.message && (
                <div className="mt-2 text-sm text-muted-foreground">{healthStatus.documentProcessing.message}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="config" className="pt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Environment Variables</h3>
                <p className="text-sm text-muted-foreground">
                  Status of required environment variables (values not shown for security)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                {[
                  "OPENAI_API_KEY",
                  "PINECONE_API_KEY",
                  "PINECONE_INDEX_NAME",
                  "PINECONE_ENVIRONMENT",
                  "PINECONE_PROJECT_ID",
                  "SUPABASE_URL",
                  "SUPABASE_ANON_KEY",
                ].map((envVar) => (
                  <div key={envVar} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">{envVar}</span>
                    <CustomBadge variant={process.env[envVar] ? "success" : "destructive"}>
                      {process.env[envVar] ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">Debug tools should be disabled in production</div>
      </CardFooter>
    </Card>
  )
}
