"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, AlertCircle, Code, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { parseStackTrace, type ParsedError } from "@/lib/utils"

interface SourceMapViewerProps {
  error: ParsedError
  showSourceMaps?: boolean
  className?: string
}

interface StackFrame {
  function?: string
  filename?: string
  line?: number
  column?: number
  source?: string
  originalSource?: string
  originalLine?: number
  originalColumn?: number
}

export function SourceMapViewer({ error, showSourceMaps = false, className }: SourceMapViewerProps) {
  const [frames, setFrames] = useState<StackFrame[]>([])
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set())
  const [sourceMapsEnabled, setSourceMapsEnabled] = useState(showSourceMaps)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Only show in development mode for security
  const isDevelopment = process.env.NODE_ENV === "development"

  useEffect(() => {
    if (error.stack) {
      const parsedFrames = parseStackTrace(error.stack)
      setFrames(parsedFrames)
    }
  }, [error.stack])

  const toggleFrame = (index: number) => {
    const newExpanded = new Set(expandedFrames)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedFrames(newExpanded)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Error details copied successfully",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const formatFilename = (filename?: string) => {
    if (!filename) return "Unknown file"

    // Extract just the filename from the full path
    const parts = filename.split("/")
    return parts[parts.length - 1] || filename
  }

  const getFrameType = (filename?: string) => {
    if (!filename) return "unknown"

    if (filename.includes("node_modules")) return "dependency"
    if (filename.includes(".next")) return "framework"
    if (filename.includes("webpack")) return "build"
    if (filename.includes("app/") || filename.includes("lib/")) return "application"
    return "unknown"
  }

  const getFrameTypeColor = (type: string) => {
    switch (type) {
      case "application":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "framework":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "dependency":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case "build":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  if (!isDevelopment) {
    return (
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          Source map viewer is only available in development mode for security reasons.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Details & Stack Trace
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSourceMapsEnabled(!sourceMapsEnabled)}>
              {sourceMapsEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {sourceMapsEnabled ? "Hide" : "Show"} Source Maps
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(error, null, 2))}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="stack">Stack Trace</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {/* Error Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive">{error.name}</Badge>
                {error.requestId && <Badge variant="outline">ID: {error.requestId}</Badge>}
                {error.timestamp && <Badge variant="secondary">{new Date(error.timestamp).toLocaleString()}</Badge>}
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error.message}</AlertDescription>
              </Alert>

              {error.filename && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {formatFilename(error.filename)}
                    {error.line && `:${error.line}`}
                    {error.column && `:${error.column}`}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stack" className="space-y-4">
            {/* Stack Trace */}
            {frames.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Stack Trace ({frames.length} frames)
                </h4>
                <div className="space-y-1">
                  {frames.map((frame, index) => {
                    const frameType = getFrameType(frame.filename)
                    const isExpanded = expandedFrames.has(index)

                    return (
                      <Collapsible key={index}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-auto p-3 text-left hover:bg-muted/50"
                            onClick={() => toggleFrame(index)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-xs ${getFrameTypeColor(frameType)}`}>
                                    {frameType}
                                  </Badge>
                                  <span className="text-xs font-mono truncate font-medium">
                                    {frame.function || "anonymous"}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {formatFilename(frame.filename)}
                                  {frame.line && `:${frame.line}`}
                                  {frame.column && `:${frame.column}`}
                                </div>
                              </div>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-5 p-3 bg-muted rounded-md">
                            <div className="space-y-2 text-xs">
                              {frame.source && (
                                <div>
                                  <span className="font-semibold">Source:</span>
                                  <pre className="mt-1 font-mono text-xs bg-background p-2 rounded overflow-x-auto border">
                                    {frame.source}
                                  </pre>
                                </div>
                              )}
                              {frame.filename && (
                                <div>
                                  <span className="font-semibold">File:</span>
                                  <span className="ml-2 font-mono break-all">{frame.filename}</span>
                                </div>
                              )}
                              {frame.line && (
                                <div>
                                  <span className="font-semibold">Position:</span>
                                  <span className="ml-2 font-mono">
                                    Line {frame.line}
                                    {frame.column && `, Column ${frame.column}`}
                                  </span>
                                </div>
                              )}
                              {sourceMapsEnabled && frame.originalSource && (
                                <div>
                                  <span className="font-semibold">Original Source:</span>
                                  <pre className="mt-1 font-mono text-xs bg-background p-2 rounded overflow-x-auto border">
                                    {frame.originalSource}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stack trace available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            {/* Additional Context */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Request Context</h4>
              <div className="grid grid-cols-1 gap-3 text-xs">
                {error.timestamp && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Timestamp:</span>
                    <span className="font-mono">{new Date(error.timestamp).toLocaleString()}</span>
                  </div>
                )}
                {error.url && (
                  <div className="flex justify-between">
                    <span className="font-semibold">URL:</span>
                    <span className="font-mono break-all text-right max-w-xs">{error.url}</span>
                  </div>
                )}
                {error.userAgent && (
                  <div className="flex justify-between">
                    <span className="font-semibold">User Agent:</span>
                    <span className="text-muted-foreground break-all text-right max-w-xs">{error.userAgent}</span>
                  </div>
                )}
                {error.requestId && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Request ID:</span>
                    <span className="font-mono">{error.requestId}</span>
                  </div>
                )}
              </div>

              {error.context && Object.keys(error.context).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Additional Context</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40 font-mono">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            {/* Raw Stack Trace */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Raw Stack Trace</h4>
              {error.stack ? (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60 font-mono border">
                  {error.stack}
                </pre>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No raw stack trace available</p>
                </div>
              )}
            </div>

            {/* Raw Error Object */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Raw Error Object</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60 font-mono border">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Named export for backward compatibility
export { SourceMapViewer as DebugPanel }

export default SourceMapViewer
