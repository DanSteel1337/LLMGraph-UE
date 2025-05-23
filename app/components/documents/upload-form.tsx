"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileText, AlertCircle, X, CheckCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"
import { cn } from "@/lib/utils"
import { debug, captureError } from "../../lib/utils/debug"

// Processing stages with enhanced styling aligned with project design
const PROCESSING_STAGES = {
  uploading: {
    label: "Uploading",
    color: "bg-blue-500",
    icon: Upload,
    description: "Uploading file to storage",
  },
  processing: {
    label: "Processing",
    color: "bg-amber-500",
    icon: Loader2,
    description: "Initializing document processing",
  },
  chunking: {
    label: "Chunking",
    color: "bg-purple-500",
    icon: FileText,
    description: "Creating semantic text segments",
  },
  embedding: {
    label: "Embedding",
    color: "bg-indigo-500",
    icon: Loader2,
    description: "Generating vector embeddings",
  },
  storing: {
    label: "Storing",
    color: "bg-teal-500",
    icon: Loader2,
    description: "Storing vectors in database",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    icon: CheckCircle,
    description: "Processing completed successfully",
  },
  error: {
    label: "Error",
    color: "bg-red-500",
    icon: AlertCircle,
    description: "An error occurred during processing",
  },
}

interface ProcessingDetails {
  chunkCount?: number
  vectorCount?: number
  processedChunks?: number
  totalChunks?: number
  storedVectors?: number
  totalVectors?: number
  currentBatch?: number
  totalBatches?: number
  processingTime?: number
  embeddingModel?: string
  embeddingDimensions?: number
}

// Separate the upload form content into its own component to be wrapped by ErrorBoundary
function UploadFormContent() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<keyof typeof PROCESSING_STAGES>("uploading")
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [processingDetails, setProcessingDetails] = useState<ProcessingDetails>({})
  const [showDetails, setShowDetails] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const allowedTypes = ["text/markdown", "text/plain", "application/pdf", "text/html"]
  const allowedExtensions = [".md", ".txt", ".pdf", ".html"]

  // Log component mount for debugging
  useEffect(() => {
    debug.log("UploadForm component mounted")
    debug.log("NEXT_PUBLIC_DEBUG status:", process.env.NEXT_PUBLIC_DEBUG)

    // Force a console log to verify console is working
    console.log("DIRECT CONSOLE LOG - UploadForm mounted, debug status:", process.env.NEXT_PUBLIC_DEBUG)

    return () => {
      debug.log("UploadForm component unmounted")
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (selectedFile) {
      debug.log("File selected:", selectedFile.name, selectedFile.type, selectedFile.size)

      if (!allowedTypes.includes(selectedFile.type)) {
        const errorMsg = "Invalid file type. Supported types: Markdown (.md), Text (.txt), PDF (.pdf), HTML (.html)"
        debug.error(errorMsg, selectedFile.type)
        setError(errorMsg)
        setFile(null)
        return
      }

      // Additional file size validation (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        const errorMsg = "File size too large. Maximum size is 10MB."
        debug.error(errorMsg, selectedFile.size)
        setError(errorMsg)
        setFile(null)
        return
      }

      setFile(selectedFile)
    } else {
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    debug.group("Document Upload Process")
    debug.log("Starting upload for file:", file.name)
    debug.time("Upload Process")

    setUploading(true)
    setProgress(0)
    setStage("uploading")
    setStatusMessage("Uploading document to storage...")
    setError(null)
    setProcessingDetails({})

    try {
      const formData = new FormData()
      formData.append("file", file)

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
          const statusMsg = `Uploading: ${percentComplete}% (${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB)`
          setStatusMessage(statusMsg)
          debug.log("Upload progress:", statusMsg)
        }
      })

      xhr.addEventListener("load", async () => {
        debug.log("XHR load event triggered, status:", xhr.status)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            debug.log("XHR response:", xhr.responseText)
            const response = JSON.parse(xhr.responseText)
            debug.log("Upload successful, parsed response:", response)

            toast({
              title: "Upload successful",
              description: `${file.name} uploaded successfully. Starting processing...`,
            })

            // Start processing with streaming updates
            await startProcessingWithStream(response.id)
          } catch (jsonError) {
            const errorInfo = captureError(jsonError, "JSON parsing")
            debug.error("Response parsing error:", xhr.responseText, errorInfo)
            console.error("Response parsing error:", xhr.responseText, jsonError)
            setError("Upload succeeded but received unexpected response format")
            setUploading(false)
          }
        } else {
          debug.error("XHR error status:", xhr.status, xhr.statusText)
          handleUploadError(xhr)
        }
      })

      xhr.addEventListener("error", (event) => {
        debug.error("XHR network error:", event)
        console.error("XHR network error:", event)
        setError("Network error occurred during upload")
        setUploading(false)
      })

      xhr.addEventListener("abort", () => {
        debug.warn("XHR request aborted")
        setError("Upload was cancelled")
        setUploading(false)
      })

      debug.log("Opening XHR connection to /api/documents/upload")
      xhr.open("POST", "/api/documents/upload")

      // Add event listener for readystatechange to debug XHR states
      xhr.addEventListener("readystatechange", () => {
        debug.log("XHR ready state changed:", xhr.readyState)
        if (xhr.readyState === 4) {
          debug.log("XHR request completed with status:", xhr.status)
        }
      })

      debug.log("Sending XHR request with form data")
      xhr.send(formData)
    } catch (err) {
      const errorInfo = captureError(err, "Upload handler")
      debug.error("Upload error:", errorInfo)
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setUploading(false)
      debug.timeEnd("Upload Process")
      debug.groupEnd()
    }
  }

  const handleUploadError = (xhr: XMLHttpRequest) => {
    debug.group("Upload Error Handling")
    debug.error("XHR error details:", {
      status: xhr.status,
      statusText: xhr.statusText,
      responseText: xhr.responseText,
      responseType: xhr.responseType,
      responseURL: xhr.responseURL,
    })

    let errorMessage = "Upload failed"
    try {
      debug.log("Attempting to parse error response")
      const errorResponse = JSON.parse(xhr.responseText)
      debug.log("Parsed error response:", errorResponse)
      errorMessage = errorResponse.error || errorResponse.message || errorMessage
    } catch (parseError) {
      debug.error("Failed to parse error response:", parseError)
      if (xhr.responseText.includes("<!DOCTYPE")) {
        debug.log("Response appears to be HTML, likely a server error page")
        if (xhr.status === 401) {
          errorMessage = "Authentication required. Please log in again."
        } else if (xhr.status >= 500) {
          errorMessage = "Server error occurred during upload"
        } else {
          errorMessage = `Upload failed with status ${xhr.status}`
        }
      } else {
        errorMessage = xhr.responseText || errorMessage
      }
    }

    debug.error("Final error message:", errorMessage)
    setError(errorMessage)
    setUploading(false)
    debug.groupEnd()
  }

  const startProcessingWithStream = async (documentId: string) => {
    debug.group("Document Processing Stream")
    debug.log("Starting processing stream for document:", documentId)
    debug.time("Processing Stream")

    setProcessing(true)
    setProgress(0)
    setStage("processing")
    setStatusMessage("Initializing document processing...")

    // Create an abort controller for the fetch request
    abortControllerRef.current = new AbortController()

    try {
      debug.log("Fetching processing stream from /api/documents/process")
      const response = await fetch(`/api/documents/process?id=${documentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      })

      debug.log("Processing stream response status:", response.status)

      if (!response.ok) {
        throw new Error(`Processing failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Process the stream
      debug.log("Starting to read processing stream")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          debug.log("Processing stream complete")
          break
        }

        // Decode the chunk and split by newlines (each line is a JSON object)
        const chunk = decoder.decode(value, { stream: true })
        debug.log("Received chunk from stream:", chunk.length, "bytes")
        const lines = chunk.split("\n").filter((line) => line.trim())
        debug.log("Parsed", lines.length, "lines from chunk")

        for (const line of lines) {
          try {
            const update = JSON.parse(line)
            debug.log("Processing update:", update)
            handleProgressUpdate(update)
          } catch (parseError) {
            // Log parsing errors but continue processing
            debug.error("Failed to parse progress update:", line, parseError)
            console.warn("Failed to parse progress update:", line, parseError)
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const errorInfo = captureError(err, "Processing stream")
        debug.error("Processing stream error:", errorInfo)
        console.error("Processing stream error:", err)

        setError(err instanceof Error ? err.message : "An unknown error occurred during processing")
        setStage("error")
        toast({
          title: "Processing error",
          description: err instanceof Error ? err.message : "An unknown error occurred during processing",
          variant: "destructive",
        })
      } else {
        debug.log("Processing stream aborted")
      }
    } finally {
      debug.timeEnd("Processing Stream")
      debug.groupEnd()
      setUploading(false)
      setProcessing(false)
    }
  }

  const handleProgressUpdate = (update: any) => {
    debug.log("Progress update received:", update)

    // Update stage
    if (update.status && PROCESSING_STAGES[update.status as keyof typeof PROCESSING_STAGES]) {
      debug.log("Updating stage from status:", update.status)
      setStage(update.status as keyof typeof PROCESSING_STAGES)
    }
    if (update.stage && PROCESSING_STAGES[update.stage as keyof typeof PROCESSING_STAGES]) {
      debug.log("Updating stage:", update.stage)
      setStage(update.stage as keyof typeof PROCESSING_STAGES)
    }

    // Update progress
    if (update.progress !== undefined) {
      debug.log("Updating progress:", update.progress)
      setProgress(update.progress)
    }

    // Update status message
    if (update.message) {
      debug.log("Updating status message:", update.message)
      setStatusMessage(update.message)
    }

    // Update processing details
    if (update.details) {
      debug.log("Updating processing details:", update.details)
      setProcessingDetails((prev) => ({ ...prev, ...update.details }))
    }

    // Handle completion
    if (update.status === "processed" || update.stage === "completed") {
      debug.log("Processing completed")
      setStage("completed")
      setProgress(100)
      toast({
        title: "Processing complete",
        description: `${file?.name} has been processed successfully.`,
      })

      // Reset form after delay
      setTimeout(() => {
        debug.log("Resetting form after completion")
        resetForm()
        router.refresh()
      }, 3000)
    }

    // Handle errors
    if (update.status === "error" || update.stage === "error") {
      debug.error("Processing error in update:", update)
      setStage("error")
      setError(update.message || "An error occurred during processing")
      setUploading(false)
      setProcessing(false)
    }
  }

  const resetForm = () => {
    debug.log("Resetting upload form")
    setFile(null)
    setUploading(false)
    setProcessing(false)
    setProgress(0)
    setStage("uploading")
    setStatusMessage("")
    setError(null)
    setProcessingDetails({})
    setShowDetails(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const cancelProcessing = () => {
    debug.log("Cancelling processing")
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    resetForm()
  }

  const currentStageInfo = PROCESSING_STAGES[stage]
  const StageIcon = currentStageInfo.icon
  const isActive = uploading || processing

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload API documentation in Markdown, Text, PDF, or HTML format. Files will be processed using semantic
          chunking and stored as vector embeddings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            file ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isActive && "border-primary/50",
          )}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept={allowedExtensions.join(",")}
            disabled={isActive}
            ref={fileInputRef}
          />

          {!file && !isActive ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Drag and drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: Markdown (.md), Text (.txt), PDF (.pdf), HTML (.html)
                </p>
                <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
              </div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isActive}>
                Select File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <FileText className="h-12 w-12 text-primary" />
                  {isActive && (
                    <div className="absolute -top-1 -right-1">
                      <StageIcon
                        className={cn(
                          "h-5 w-5 text-white rounded-full p-1",
                          currentStageInfo.color,
                          stage === "embedding" || stage === "storing" || stage === "processing" ? "animate-spin" : "",
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium truncate max-w-xs mx-auto">{file?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {file && `${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type}`}
                </p>
              </div>

              {isActive && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className={cn("h-2 flex-1")} />
                    <span className="text-xs font-medium w-12 text-right">{progress}%</span>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        currentStageInfo.color,
                        (stage === "embedding" || stage === "storing" || stage === "processing") && "animate-pulse",
                      )}
                    />
                    <p className="text-xs font-medium">{currentStageInfo.label}</p>
                  </div>

                  <p className="text-xs text-muted-foreground">{statusMessage}</p>

                  {/* Processing details toggle */}
                  {Object.keys(processingDetails).length > 0 && (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="h-6 text-xs"
                      >
                        {showDetails ? "Hide" : "Show"} Details
                      </Button>

                      {showDetails && (
                        <div className="text-xs text-left bg-muted/50 p-3 rounded-md space-y-1">
                          {processingDetails.chunkCount && <p>Chunks created: {processingDetails.chunkCount}</p>}
                          {processingDetails.vectorCount && <p>Vectors stored: {processingDetails.vectorCount}</p>}
                          {processingDetails.processedChunks && processingDetails.totalChunks && (
                            <p>
                              Embedding progress: {processingDetails.processedChunks}/{processingDetails.totalChunks}
                            </p>
                          )}
                          {processingDetails.storedVectors && processingDetails.totalVectors && (
                            <p>
                              Storage progress: {processingDetails.storedVectors}/{processingDetails.totalVectors}
                            </p>
                          )}
                          {processingDetails.embeddingModel && (
                            <p>
                              Model: {processingDetails.embeddingModel} ({processingDetails.embeddingDimensions}D)
                            </p>
                          )}
                          {processingDetails.processingTime && (
                            <p>Processing time: {(processingDetails.processingTime / 1000).toFixed(1)}s</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-center">
                {!isActive ? (
                  <>
                    <Button variant="outline" onClick={resetForm}>
                      Change File
                    </Button>
                    <Button onClick={handleUpload} disabled={!!error}>
                      Upload & Process
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={cancelProcessing}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main UploadForm component that includes the ErrorBoundary
export function UploadForm() {
  const { handleError } = useErrorBoundaryWithToast()

  // Log component mount for debugging
  useEffect(() => {
    debug.log("UploadForm wrapper mounted")

    // Force a console log to verify console is working
    console.log("DIRECT CONSOLE LOG - UploadForm wrapper mounted")
  }, [])

  return (
    <ErrorBoundary
      onError={(error) => {
        debug.error("Error boundary caught error:", error)
        console.error("Error boundary caught error:", error)
        handleError(error)
      }}
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>An error occurred in the upload form.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              There was a problem loading the document upload form. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      }
    >
      <UploadFormContent />
    </ErrorBoundary>
  )
}

// Export as named export (not default)
export default UploadForm
