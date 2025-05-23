"use client"

import { useState, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function UploadForm() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const router = useRouter()
  const abortControllerRef = useRef(new AbortController())

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return
      }

      const file = acceptedFiles[0]

      setIsUploading(true)
      setUploadProgress(0)

      try {
        await handleUpload(file)
      } catch (error: any) {
        toast.error(error.message || "Upload failed")
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [router],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
    },
  })

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    // Use fetch API for Edge Runtime compatibility
    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
      credentials: "include", // Important for auth cookies
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Upload failed" }))
      throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()

    toast({
      title: "Upload successful",
      description: `${file.name} uploaded successfully. Starting processing...`,
    })

    // Start processing with streaming updates
    await startProcessingWithStream(data.id)
  }

  const startProcessingWithStream = async (documentId: string) => {
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/documents/process?id=${documentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this line
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Processing failed" }))
        throw new Error(errorData.error || errorData.message || `Processing failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()

      if (!reader) {
        throw new Error("Failed to get reader from response body")
      }

      const decoder = new TextDecoder()
      let partialData = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        partialData += decoder.decode(value)

        const completeLines = partialData.split("\n")

        // The last line might be incomplete, so we keep it in partialData
        partialData = completeLines.pop() || ""

        for (const line of completeLines) {
          if (line.trim() === "") continue

          try {
            const json = JSON.parse(line)
            if (json.type === "done") {
              toast.success("Document processing complete!")
              router.refresh()
            } else if (json.type === "error") {
              toast.error(json.message || "An error occurred during processing.")
            } else if (json.type === "info") {
              toast.info(json.message)
            }
          } catch (e) {
            console.error("Error parsing JSON:", e)
            console.log("Problematic line:", line)
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        toast.info("Processing cancelled.")
      } else {
        toast.error(error.message || "An error occurred during processing.")
      }
    }
  }

  const handleCancel = () => {
    abortControllerRef.current.abort()
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div
        {...getRootProps()}
        className={`relative w-full h-48 p-4 rounded-md border-2 border-dashed cursor-pointer ${
          isDragActive ? "border-primary-500" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          {isUploading ? (
            <>
              <p>Uploading... {uploadProgress}%</p>
              <progress value={uploadProgress} max="100" />
              <button onClick={handleCancel} className="mt-2 text-red-500">
                Cancel
              </button>
            </>
          ) : (
            <>
              <p>
                Drag 'n' drop some files here, or click to select files
                <br />
                (Only *.pdf files will be accepted)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
