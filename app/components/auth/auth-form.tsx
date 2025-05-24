"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "../../../lib/auth"
import { useToast } from "../../../hooks/use-toast"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"

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
      const { user, error } = await signIn(email, password)

      if (error) {
        throw error
      }

      if (!user) {
        throw new Error("Authentication failed")
      }

      toast({
        title: "Success",
        description: "You have been logged in successfully.",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("[AUTH FORM] Login error:", error)
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
