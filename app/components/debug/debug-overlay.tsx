"use client"

import { useState, useEffect } from "react"
import { X, Bug, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LogEntry {
  type: "log" | "error" | "warn" | "info"
  message: string
  timestamp: string
  details?: any
}

export function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isDebugEnabled, setIsDebugEnabled] = useState(false)

  useEffect(() => {
    // Only show in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG !== "true") {
      return
    }

    setIsDebugEnabled(true)

    // Override console methods to capture logs
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    }

    console.log = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      setLogs((prev) =>
        [
          ...prev,
          {
            type: "log",
            message,
            timestamp: new Date().toISOString(),
            details: args.length > 1 ? args.slice(1) : undefined,
          },
        ].slice(-100),
      ) // Keep only last 100 logs

      originalConsole.log.apply(console, args)
    }

    console.error = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      setLogs((prev) =>
        [
          ...prev,
          {
            type: "error",
            message,
            timestamp: new Date().toISOString(),
            details: args.length > 1 ? args.slice(1) : undefined,
          },
        ].slice(-100),
      )

      originalConsole.error.apply(console, args)
    }

    console.warn = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      setLogs((prev) =>
        [
          ...prev,
          {
            type: "warn",
            message,
            timestamp: new Date().toISOString(),
            details: args.length > 1 ? args.slice(1) : undefined,
          },
        ].slice(-100),
      )

      originalConsole.warn.apply(console, args)
    }

    console.info = (...args) => {
      const message = args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" ")

      setLogs((prev) =>
        [
          ...prev,
          {
            type: "info",
            message,
            timestamp: new Date().toISOString(),
            details: args.length > 1 ? args.slice(1) : undefined,
          },
        ].slice(-100),
      )

      originalConsole.info.apply(console, args)
    }

    // Add a test log
    console.log("Debug overlay initialized")

    return () => {
      // Restore original console methods
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
      console.info = originalConsole.info
    }
  }, [])

  // Don't render anything if debug is not enabled
  if (!isDebugEnabled) {
    return null
  }

  return (
    <>
      {!isVisible ? (
        <Button
          size="sm"
          variant="outline"
          className="fixed bottom-4 right-4 z-50 bg-background opacity-70 hover:opacity-100"
          onClick={() => setIsVisible(true)}
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
        </Button>
      ) : (
        <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 bg-background border rounded-t-lg shadow-lg">
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center">
              <Bug className="h-4 w-4 mr-2" />
              <h3 className="text-sm font-medium">Debug Console</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setIsVisible(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="max-h-96 overflow-y-auto p-2 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No logs yet</div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 p-1 rounded ${
                      log.type === "error"
                        ? "bg-red-500/10 text-red-500"
                        : log.type === "warn"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : log.type === "info"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-gray-500/10"
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      <span className="opacity-50 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="whitespace-pre-wrap break-all">{log.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="p-2 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{logs.length} log entries</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setLogs([])}>
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => {
                  const logText = logs
                    .map((log) => `[${log.type.toUpperCase()}] ${log.timestamp} - ${log.message}`)
                    .join("\n")

                  navigator.clipboard
                    .writeText(logText)
                    .then(() => console.info("Logs copied to clipboard"))
                    .catch((err) => console.error("Failed to copy logs:", err))
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
