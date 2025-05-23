/**
 * Document Upload Form with Real-Time Progress Streaming
 *
 * Purpose: Handles file uploads with real-time processing feedback
 *
 * Features:
 * - File selection and validation for supported document types
 * - Real-time upload progress tracking with XMLHttpRequest
 * - Streaming progress updates during document processing
 * - Visual progress indicators with stage-specific styling
 * - Error handling with detailed error messages
 * - Cancellation support for long-running operations
 * - Integration with existing shadcn/ui components and error boundaries
 *
 * Runtime context: Client Component
 * Services: Vercel Blob (via upload API), Document Processing (via streaming API)
 *
 * Supported File Types:
 * - text/markdown (.md) - API documentation in Markdown format
 * - text/plain (.txt) - Plain text documentation
 * - application/pdf (.pdf) - PDF documentation files
 * - text/html (.html) - HTML documentation pages
 *
 * Processing Stages:
 * - uploading: File upload to Vercel Blob storage
 * - processing: Initial processing setup and content fetching
 * - chunking: Semantic text splitting and structure analysis
 * - embedding: Embedding generation with OpenAI text-embedding-3-large
 * - storing: Vector storage in Pinecone with metadata
 * - completed: Processing finished successfully
 * - error: Error occurred during any stage
 *
 * UI Integration:
 * - Uses shadcn/ui components (Card, Button, Progress, Alert)
 * - Follows existing error boundary patterns
 * - Integrates with toast notification system
 * - Responsive design with proper loading states
 */

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

  // Cleanup function for the stream
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (selectedFile) {
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Supported types: Markdown (.md), Text (.txt), PDF (.pdf), HTML (.html)")
        setFile(null)
        return
      }

      // Additional file size validation (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size too large. Maximum size is 10MB.")
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
          setStatusMessage(
            `Uploading: ${percentComplete}% (${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB)`,
          )
        }
      })

      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)

            toast({
              title: "Upload successful",
              description: `${file.name} uploaded successfully. Starting processing...`,
            })

            // Start processing with streaming updates
            await startProcessingWithStream(response.id)
          } catch (jsonError) {
            console.error("Response parsing error:", xhr.responseText)
            setError("Upload succeeded but received unexpected response format")
            setUploading(false)
          }
        } else {
          handleUploadError(xhr)
        }
      })

      xhr.addEventListener("error", () => {
        setError("Network error occurred during upload")
        setUploading(false)
      })

      xhr.addEventListener("abort", () => {
        setError("Upload was cancelled")
        setUploading(false)
      })

      xhr.open("POST", "/api/documents/upload")
      xhr.send(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setUploading(false)
    }
  }

  const handleUploadError = (xhr: XMLHttpRequest) => {
    let errorMessage = "Upload failed"
    try {
      const errorResponse = JSON.parse(xhr.responseText)
      errorMessage = errorResponse.error || errorMessage
    } catch (parseError) {
      if (xhr.responseText.includes("<!DOCTYPE")) {
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
    setError(errorMessage)
    setUploading(false)
  }

  const startProcessingWithStream = async (documentId: string) => {
    setProcessing(true)
    setProgress(0)
    setStage("processing")
    setStatusMessage("Initializing document processing...")

    // Create an abort controller for the fetch request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/documents/process?id=${documentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Processing failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Process the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode the chunk and split by newlines (each line is a JSON object)
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          try {
            const update = JSON.parse(line)
            handleProgressUpdate(update)
          } catch (parseError) {
            // Log parsing errors but continue processing
            console.warn("Failed to parse progress update:", line)
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "An unknown error occurred during processing")
        setStage("error")
        toast({
          title: "Processing error",
          description: err instanceof Error ? err.message : "An unknown error occurred during processing",
          variant: "destructive",
        })
      }
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const handleProgressUpdate = (update: any) => {
    // Update stage
    if (update.status && PROCESSING_STAGES[update.status as keyof typeof PROCESSING_STAGES]) {
      setStage(update.status as keyof typeof PROCESSING_STAGES)
    }
    if (update.stage && PROCESSING_STAGES[update.stage as keyof typeof PROCESSING_STAGES]) {
      setStage(update.stage as keyof typeof PROCESSING_STAGES)
    }

    // Update progress
    if (update.progress !== undefined) {
      setProgress(update.progress)
    }

    // Update status message
    if (update.message) {
      setStatusMessage(update.message)
    }

    // Update processing details
    if (update.details) {
      setProcessingDetails((prev) => ({ ...prev, ...update.details }))
    }

    // Handle completion
    if (update.status === "processed" || update.stage === "completed") {
      setStage("completed")
      setProgress(100)
      toast({
        title: "Processing complete",
        description: `${file?.name} has been processed successfully.`,
      })

      // Reset form after delay
      setTimeout(() => {
        resetForm()
        router.refresh()
      }, 3000)
    }

    // Handle errors
    if (update.status === "error" || update.stage === "error") {
      setStage("error")
      setError(update.message || "An error occurred during processing")
      setUploading(false)
      setProcessing(false)
    }
  }

  const resetForm = () => {
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

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
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
