import type React from "react"
import { AuthProvider } from "./components/auth/auth-provider"
import { ThemeProvider } from "../components/theme-provider"
import "./globals.css"

export const metadata = {
  title: "LLMGraph-UE - RAG Dashboard",
  description: "A serverless RAG dashboard for API documentation",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
