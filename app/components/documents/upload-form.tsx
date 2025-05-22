/**
 * Purpose: Document upload form
 * Logic:
 * - Handles file selection and upload
 * - Shows upload progress
 * - Validates file types
 * Runtime context: Client Component
 * Services: Vercel Blob (via API route)
 */
"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/app/components/ui/use-toast"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"

// Separate the upload form content into its own component to be wrapped by ErrorBoundary
function UploadFormContent() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const allowedTypes = ["text/markdown", "text/plain", "application/pdf", "text/html"]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (selectedFile) {
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Supported types: Markdown, Text, PDF, HTML")
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
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText)
          toast({
            title: "Upload successful",
            description: `${file.name} has been uploaded and is being processed.`,
          })
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          router.refresh()
        } else {
          let errorMessage = "Upload failed"
          try {
            const response = JSON.parse(xhr.responseText)
            errorMessage = response.error || errorMessage
          } catch (e) {
            // Parsing error, use default message
          }
          setError(errorMessage)
        }
      })

      xhr.addEventListener("error", () => {
        setError("Network error occurred during upload")
      })

      xhr.addEventListener("abort", () => {
        setError("Upload was aborted")
      })

      xhr.open("POST", "/api/documents/upload")
      xhr.send(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>Upload API documentation in Markdown, Text, PDF, or HTML format.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            file ? "border-primary" : "border-muted-foreground/25"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept=".md,.txt,.pdf,.html"
            disabled={uploading}
            ref={fileInputRef}
          />

          {!file ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Drag and drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supported formats: Markdown, Text, PDF, HTML</p>
              </div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Select File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(2)} KB • {file.type}
                </p>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null)
                    setError(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  disabled={uploading}
                >
                  Change
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !!error}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
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
