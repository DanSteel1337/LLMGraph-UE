/**
 * Debug initialization script
 *
 * This script initializes debug tools and ensures console logging works in production
 * when NEXT_PUBLIC_DEBUG is enabled.
 */

// Only run in browser environment
if (typeof window !== "undefined") {
  // Check if debug mode is enabled
  const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === "true"

  if (isDebugEnabled) {
    console.log("[DEBUG INIT] Debug mode is enabled")

    // Ensure console methods aren't stripped out in production
    if (process.env.NODE_ENV === "production") {
      console.log("[DEBUG INIT] Ensuring console methods are available in production")

      // Force console to be visible in production
      try {
        // Store original console methods
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info,
        }

        // Override console methods to ensure they work in production
        console.log = (...args) => {
          originalConsole.log.apply(console, args)
        }

        console.error = (...args) => {
          originalConsole.error.apply(console, args)
        }

        console.warn = (...args) => {
          originalConsole.warn.apply(console, args)
        }

        console.info = (...args) => {
          originalConsole.info.apply(console, args)
        }

        console.log("[DEBUG INIT] Console methods have been preserved for production")
      } catch (e) {
        console.error("[DEBUG INIT] Failed to override console methods:", e)
      }
    }

    // Add a global error handler to catch unhandled errors
    window.addEventListener("error", (event) => {
      console.error("[GLOBAL ERROR]", event.error)
      console.error("Error details:", {
        message: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Add a global promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[UNHANDLED PROMISE REJECTION]", event.reason)
      console.error("Rejection details:", {
        message: event.reason?.message,
        stack: event.reason?.stack,
      })
    })

    console.log("[DEBUG INIT] Global error handlers have been installed")

    // Log environment information
    console.log("[DEBUG INIT] Environment:", {
      nodeEnv: process.env.NODE_ENV,
      nextPublicDebug: process.env.NEXT_PUBLIC_DEBUG,
      userAgent: navigator.userAgent,
      url: window.location.href,
    })
  }
}

export {}
