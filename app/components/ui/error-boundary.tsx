"use client"

import React from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { parseError, sanitizeErrorForClient, generateRequestId } from "@/lib/utils/edge-error-parser"
import SourceMapViewer from "@/app/components/debug/source-map-viewer"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showSourceMaps?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  parsedError: any | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      parsedError: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = generateRequestId()

    // Parse error with context
    const parsedError = parseError(error, {
      requestId: errorId,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
    })

    return {
      hasError: true,
      error,
      errorId,
      parsedError: sanitizeErrorForClient(parsedError),
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Enhanced error logging with context
    const context = {
      requestId: this.state.errorId || generateRequestId(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    }

    const parsedError = parseError(error, context)

    console.error("Error caught by boundary:", {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context,
      parsedError,
    })

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === "development"

      // Otherwise, render the default error UI with source map support
      return (
        <div className="space-y-4">
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p>{this.state.error?.message || "An unexpected error occurred"}</p>
                {this.state.errorId && <p className="text-xs text-muted-foreground">Error ID: {this.state.errorId}</p>}
              </div>
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null, errorId: null, parsedError: null })}
            >
              Try again
            </Button>
          </Alert>

          {/* Show source map viewer in development */}
          {isDevelopment && this.state.parsedError && this.props.showSourceMaps && (
            <SourceMapViewer error={this.state.parsedError} showSourceMaps={true} />
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Helper hook to use toast notifications with error boundaries
export function useErrorBoundaryWithToast() {
  const { toast } = useToast()

  const handleError = async (error: Error) => {
    const context = {
      requestId: generateRequestId(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
    }

    const parsedError = parseError(error, context)

    console.error("Client error:", parsedError)

    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    })
  }

  return { handleError }
}
