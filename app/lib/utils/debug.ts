/**
 * Debug utility for consistent logging across client and server
 *
 * This utility ensures logs are properly displayed in both development and production
 * when NEXT_PUBLIC_DEBUG is enabled.
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Check if debug mode is enabled
const isDebugEnabled = () => {
  if (isBrowser) {
    return process.env.NEXT_PUBLIC_DEBUG === "true"
  }
  return process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV === "development"
}

// Force enable console in production when debug is enabled
if (isBrowser && isDebugEnabled() && process.env.NODE_ENV === "production") {
  // Ensure console methods aren't stripped out in production
  const originalConsole = { ...console }

  // Store original methods to prevent infinite recursion
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info

  // Override console methods to ensure they work in production
  console.log = (...args) => {
    originalLog.apply(console, ["[DEBUG]", ...args])
  }

  console.error = (...args) => {
    originalError.apply(console, ["[ERROR]", ...args])
  }

  console.warn = (...args) => {
    originalWarn.apply(console, ["[WARN]", ...args])
  }

  console.info = (...args) => {
    originalInfo.apply(console, ["[INFO]", ...args])
  }
}

/**
 * Debug logger that only logs when debug mode is enabled
 */
export const debug = {
  log: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log("[DEBUG]", ...args)
    }
  },

  error: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.error("[ERROR]", ...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.warn("[WARN]", ...args)
    }
  },

  info: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.info("[INFO]", ...args)
    }
  },

  group: (label: string) => {
    if (isDebugEnabled() && console.group) {
      console.group(`[DEBUG GROUP] ${label}`)
    }
  },

  groupEnd: () => {
    if (isDebugEnabled() && console.groupEnd) {
      console.groupEnd()
    }
  },

  // Track timing for performance debugging
  time: (label: string) => {
    if (isDebugEnabled() && console.time) {
      console.time(`[DEBUG TIMER] ${label}`)
    }
  },

  timeEnd: (label: string) => {
    if (isDebugEnabled() && console.timeEnd) {
      console.timeEnd(`[DEBUG TIMER] ${label}`)
    }
  },

  // Trace with stack trace
  trace: (message: string) => {
    if (isDebugEnabled()) {
      console.error(`[TRACE] ${message}`)
      console.trace()
    }
  },
}

/**
 * Error tracking utility that captures and formats errors with stack traces
 */
export function captureError(error: any, context?: string): { message: string; stack?: string; context?: string } {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  if (isDebugEnabled()) {
    console.error(`[ERROR CAPTURED]${context ? ` in ${context}` : ""}:`, errorObj)
    console.error("Stack trace:", errorObj.stack)
  }

  return {
    message: errorObj.message,
    stack: isDebugEnabled() ? errorObj.stack : undefined,
    context,
  }
}

// Export debug status for conditional rendering
export const isDebug = isDebugEnabled()
