/**
 * Next.js Instrumentation Hook
 *
 * Purpose: Initialize error tracking and monitoring for the application
 * Features:
 * - Edge Runtime compatible initialization
 * - Global error handlers for uncaught exceptions
 * - Performance monitoring setup
 * - Request ID propagation
 *
 * Runtime: Node.js and Edge Runtime compatible
 */

// Declare EdgeRuntime variable
declare const EdgeRuntime: any

export async function register() {
  // Only run instrumentation in production or when explicitly enabled
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_INSTRUMENTATION === "true") {
    console.log("🔧 Initializing LLMGraph-UE instrumentation...")

    try {
      // Initialize error tracking
      if (typeof globalThis !== "undefined") {
        // Set up global error handlers for unhandled errors
        globalThis.addEventListener?.("error", (event) => {
          const errorInfo = {
            type: "global_error",
            message: event.error?.message || "Unknown error",
            stack: event.error?.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            url: typeof window !== "undefined" ? window.location?.href : undefined,
          }

          console.error("🚨 Global error caught:", JSON.stringify(errorInfo, null, 2))

          // In production, you might want to send this to an external monitoring service
          if (process.env.NODE_ENV === "production") {
            // Example: Send to monitoring service
            // await sendToMonitoringService(errorInfo)
          }
        })

        // Handle unhandled promise rejections
        globalThis.addEventListener?.("unhandledrejection", (event) => {
          const rejectionInfo = {
            type: "unhandled_rejection",
            reason: event.reason,
            promise: event.promise,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            url: typeof window !== "undefined" ? window.location?.href : undefined,
          }

          console.error("🚨 Unhandled promise rejection:", JSON.stringify(rejectionInfo, null, 2))

          // Prevent the default browser behavior (logging to console)
          event.preventDefault()

          // In production, you might want to send this to an external monitoring service
          if (process.env.NODE_ENV === "production") {
            // Example: Send to monitoring service
            // await sendToMonitoringService(rejectionInfo)
          }
        })
      }

      // Server-side error handling (Node.js environment)
      if (typeof process !== "undefined" && process.on) {
        // Handle uncaught exceptions
        process.on("uncaughtException", (error) => {
          const errorInfo = {
            type: "uncaught_exception",
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
          }

          console.error("🚨 Uncaught exception:", JSON.stringify(errorInfo, null, 2))

          // In production, gracefully shut down after logging
          if (process.env.NODE_ENV === "production") {
            console.error("🔄 Gracefully shutting down due to uncaught exception...")
            process.exit(1)
          }
        })

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
          const rejectionInfo = {
            type: "unhandled_rejection_server",
            reason: reason,
            promise: promise,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
          }

          console.error("🚨 Unhandled rejection (server):", JSON.stringify(rejectionInfo, null, 2))

          // In production, you might want to gracefully shut down
          if (process.env.NODE_ENV === "production") {
            console.error("🔄 Gracefully shutting down due to unhandled rejection...")
            process.exit(1)
          }
        })

        // Handle process warnings
        process.on("warning", (warning) => {
          const warningInfo = {
            type: "process_warning",
            name: warning.name,
            message: warning.message,
            stack: warning.stack,
            timestamp: new Date().toISOString(),
          }

          console.warn("⚠️ Process warning:", JSON.stringify(warningInfo, null, 2))
        })
      }

      // Initialize performance monitoring
      if (typeof performance !== "undefined") {
        // Monitor memory usage (if available)
        if ("memory" in performance) {
          setInterval(() => {
            const memoryInfo = {
              type: "memory_usage",
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
              timestamp: new Date().toISOString(),
            }

            // Only log if memory usage is high
            const usagePercent = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
            if (usagePercent > 0.8) {
              console.warn("📊 High memory usage detected:", JSON.stringify(memoryInfo, null, 2))
            }
          }, 30000) // Check every 30 seconds
        }
      }

      console.log("✅ LLMGraph-UE instrumentation initialized successfully")

      // Log environment information
      const envInfo = {
        nodeEnv: process.env.NODE_ENV,
        instrumentationEnabled: process.env.ENABLE_INSTRUMENTATION,
        timestamp: new Date().toISOString(),
        runtime: typeof EdgeRuntime !== "undefined" ? "edge" : "node",
      }

      console.log("🌍 Environment info:", JSON.stringify(envInfo, null, 2))
    } catch (error) {
      console.error("❌ Failed to initialize instrumentation:", error)

      // Don't throw here to avoid breaking the application startup
      // Just log the error and continue
    }
  } else {
    console.log("⏭️ Instrumentation skipped (not in production and ENABLE_INSTRUMENTATION not set)")
  }
}

/**
 * Optional: Export a function to manually send errors to monitoring service
 * This can be used by other parts of the application
 */
export async function reportError(error: Error, context?: Record<string, unknown>) {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context: context || {},
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    url: typeof window !== "undefined" ? window.location?.href : undefined,
  }

  console.error("📤 Manual error report:", JSON.stringify(errorReport, null, 2))

  // In production, send to external monitoring service
  if (process.env.NODE_ENV === "production") {
    // Example: await sendToMonitoringService(errorReport)
  }
}
