"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "../components/layout/header"
import { Sidebar } from "../components/layout/sidebar"
import { useAuth } from "../components/auth/auth-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Simple auth check for single-user access
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // Redirect if not authenticated
  if (!user) {
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}
