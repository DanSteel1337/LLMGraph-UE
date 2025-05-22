import type React from "react"
/**
 * Purpose: Root layout for the entire application
 * Logic:
 * - Provides global providers (ThemeProvider, AuthProvider)
 * - Sets up metadata for the application
 * - Handles global styling
 * Runtime context: Server Component
 */
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/app/components/ui/toaster"
import { AuthProvider } from "@/app/components/auth/auth-provider"
import "@/app/globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LLMGraph-UE: Serverless RAG Dashboard",
  description: "A serverless RAG dashboard for API documentation",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
