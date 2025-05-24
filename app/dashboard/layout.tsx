import type React from "react"
import { redirect } from "next/navigation"
import { getSupabaseServer } from "../../lib/auth"
import { Header } from "../components/layout/header"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth check
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getUser()

  // If no session, redirect to login
  if (!data.user || error) {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
