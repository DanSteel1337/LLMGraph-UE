"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { signIn } from "@/lib/auth"
import { ErrorBoundary } from "@/app/components/ui/error-boundary"
import { AlertCircle } from "lucide-react"

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        throw error
      }

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Login failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ErrorBoundary
      onError={(error) => {
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        })
      }}
      fallback={
        <div className="p-6 flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Authentication Error</h3>
          <p className="text-muted-foreground text-center mb-4">
            An error occurred in the authentication form. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </ErrorBoundary>
  )
}
