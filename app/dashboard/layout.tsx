"use client"

import type React from "react"

/**
 * Purpose: Layout for dashboard pages
 * Logic:
 * - Provides consistent layout with header and sidebar
 * - Protects routes requiring authentication
 * Runtime context: Client Component (for auth check)
 */
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
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  // Show nothing while loading or if not authenticated
  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
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
