"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../lib/hooks/use-auth"
import { useToast } from "../../../hooks/use-toast"
import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"

export function Header() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      const { error } = await signOut()

      if (error) {
        throw error
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })

      router.push("/auth/login")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Logout failed",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Get display name from user object
  const displayName = user?.email?.split("@")[0] || "User"

  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold">LLMGraph-UE</span>
          </Link>
          <nav className="hidden md:flex">
            <ul className="flex gap-4">
              <li>
                <Link href="/dashboard" className="text-sm font-medium hover:underline">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/documents" className="text-sm font-medium hover:underline">
                  Documents
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="text-sm font-medium hover:underline">
                  Settings
                </Link>
              </li>
              <li>
                <Link href="/dashboard/debug" className="text-sm font-medium hover:underline">
                  Debug
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {displayName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLoggingOut} onClick={handleLogout}>
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
