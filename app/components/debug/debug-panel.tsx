"use client"

import { useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Separator } from "../../../components/ui/separator"
import { CustomBadge } from "../ui/custom-badge"
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from "lucide-react"
import { useToast } from "../../../components/ui/use-toast"

interface DebugPanelProps {
  initialTab?: string
}

interface ServiceTest {
  status: "success" | "error"
  latency?: number
  message: string
  stats?: {
    totalVectors?: number
    dimension?: number
  }
}

interface DebugData {
  timestamp: string
  user: {
    id: string
    email: string
  }
  environment: {
    nodeEnv: string
    debug: string
    runtime: string
    validation?: {
      isValid: boolean
      missing: string[]
    }
  }
  tests: Record<string, ServiceTest>
  services: Record<string, any>
}

export function DebugPanel({ initialTab = "health" }: DebugPanelProps) {
  const [healthData, setHealthData] = useState<DebugData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const checkHealth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug", {
        method: "GET",
        credentials: "include", // Important for auth cookies
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Health check failed with status: ${response.status}`)
      }

      const data: DebugData = await response.json()
      setHealthData(data)

      // Check for any errors in the results
      const hasErrors = Object.values(data.tests || {}).some((test) => test.status === "error")

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
      toast({
        title: "Error running diagnostics",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-run diagnostics on mount
  useEffect(() => {
    checkHealth()
  }, [])

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

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-destructive">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {healthData?.environment?.validation && !healthData.environment.validation.isValid && (
                <div className="rounded-md bg-yellow-500/15 p-3 text-yellow-700">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>Missing environment variables: {healthData.environment.validation.missing.join(", ")}</span>
                  </div>
                </div>
              )}

              {healthData?.tests ? (
                <div className="space-y-4">
                  {Object.entries(healthData.tests).map(([service, data]: [string, ServiceTest]) => (
                    <div key={service} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {data.status === "success" ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span className="font-medium capitalize">{service}</span>
                        </div>
                        <CustomBadge variant={data.status === "success" ? "success" : "destructive"}>
                          {data.status === "success" ? "Healthy" : "Error"}
                        </CustomBadge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {data.status === "success" ? (
                          <div>
                            {data.latency && <div>Latency: {data.latency}ms</div>}
                            <div>Status: {data.message}</div>
                            {service === "pinecone" && data.stats && (
                              <div>
                                <div>Total Vectors: {data.stats.totalVectors}</div>
                                <div>Dimension: {data.stats.dimension}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-500">{data.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !error &&
                !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No health data available. Click "Check Health" to run diagnostics.
                  </div>
                )
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

              {healthData?.services ? (
                <div className="space-y-2">
                  {/* OpenAI */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">OPENAI_API_KEY</span>
                    <CustomBadge variant={healthData.services.openai ? "success" : "destructive"}>
                      {healthData.services.openai ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>

                  {/* Pinecone */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">PINECONE_*</span>
                    <CustomBadge variant={healthData.services.pinecone ? "success" : "destructive"}>
                      {healthData.services.pinecone ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>

                  {/* KV */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">VERCEL_KV</span>
                    <CustomBadge variant={healthData.services.vercel_kv ? "success" : "destructive"}>
                      {healthData.services.vercel_kv ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>

                  {/* Supabase */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">SUPABASE_*</span>
                    <CustomBadge variant={healthData.services.supabase ? "success" : "destructive"}>
                      {healthData.services.supabase ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>

                  {/* Vercel Blob */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-sm">BLOB_READ_WRITE_TOKEN</span>
                    <CustomBadge variant={healthData.services.vercel_blob ? "success" : "destructive"}>
                      {healthData.services.vercel_blob ? "Set" : "Missing"}
                    </CustomBadge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Run health checks to see environment variable status
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Debug tools should be disabled in production
          {healthData && (
            <span className="ml-2">• Last check: {new Date(healthData.timestamp).toLocaleTimeString()}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
