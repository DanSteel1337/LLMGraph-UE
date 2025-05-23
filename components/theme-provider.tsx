"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"
import { ErrorBoundary } from "@/app/components/ui/error-boundary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface CustomThemeProviderProps extends Omit<ThemeProviderProps, "attribute" | "defaultTheme" | "enableSystem"> {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

// Theme validation
const VALID_THEMES = ["light", "dark", "system"] as const
type ValidTheme = (typeof VALID_THEMES)[number]

function validateTheme(theme: string): theme is ValidTheme {
  return VALID_THEMES.includes(theme as ValidTheme)
}

// Separate the theme provider content to be wrapped by ErrorBoundary
function ThemeProviderContent({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = true,
  storageKey = "llmgraph-ue-theme",
  ...props
}: CustomThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Validate default theme
  const validatedDefaultTheme = validateTheme(defaultTheme) ? defaultTheme : "system"

  // Show loading state during hydration to prevent flash
  if (!mounted) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>
  }

  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={validatedDefaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey={storageKey}
      themes={["light", "dark", "system"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Main ThemeProvider component with error boundary
export function ThemeProvider(props: CustomThemeProviderProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Theme Provider Error:", error, errorInfo)

        // Clear potentially corrupted theme data
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(props.storageKey || "llmgraph-ue-theme")
          } catch (e) {
            console.warn("Failed to clear theme storage:", e)
          }
        }
      }}
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Theme System Error</AlertTitle>
                <AlertDescription>
                  There was a problem loading the theme system. The application will continue with default styling.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    // Clear theme storage and reload
                    if (typeof window !== "undefined") {
                      try {
                        localStorage.removeItem(props.storageKey || "llmgraph-ue-theme")
                      } catch (e) {
                        console.warn("Failed to clear theme storage:", e)
                      }
                    }
                    window.location.reload()
                  }}
                  variant="default"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Theme and Reload
                </Button>

                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  Continue with Default Theme
                </Button>
              </div>
            </div>
          </div>

          {/* Render children with basic styling as fallback */}
          <div className="hidden">{props.children}</div>
        </div>
      }
    >
      <ThemeProviderContent {...props} />
    </ErrorBoundary>
  )
}

// Hook for theme validation and error handling
export function useThemeWithValidation() {
  const [themeError, setThemeError] = useState<string | null>(null)

  useEffect(() => {
    // Validate theme on mount
    if (typeof window !== "undefined") {
      try {
        const storedTheme = localStorage.getItem("llmgraph-ue-theme")
        if (storedTheme && !validateTheme(storedTheme)) {
          setThemeError(`Invalid theme "${storedTheme}" found in storage`)
          localStorage.removeItem("llmgraph-ue-theme")
        }
      } catch (error) {
        setThemeError("Failed to access theme storage")
        console.warn("Theme validation error:", error)
      }
    }
  }, [])

  return { themeError, clearThemeError: () => setThemeError(null) }
}

// Export theme constants for use in other components
export const THEME_CONFIG = {
  STORAGE_KEY: "llmgraph-ue-theme",
  DEFAULT_THEME: "system" as const,
  VALID_THEMES,
  ATTRIBUTE: "class" as const,
} as const

// Type exports
export type { CustomThemeProviderProps, ValidTheme }
