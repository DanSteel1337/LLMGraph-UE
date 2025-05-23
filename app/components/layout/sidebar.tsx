/**
 * Sidebar Navigation Component
 * 
 * Purpose: Provides main navigation for the dashboard
 * 
 * Features:
 * - Navigation links with active state highlighting
 * - Icons for each navigation item
 * - Responsive design (hidden on mobile)
 * - Added error logs page to navigation
 * 
 * Used in: Dashboard layout
 * Runtime context: Client Component
 */
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MessageSquare, FileText, Settings, Bug, AlertCircle } from "lucide-react"

const navItems = [
  {
    name: "Chat",
    href: "/dashboard",
    icon: MessageSquare,
  },
  {
    name: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    name: "Debug",
    href: "/dashboard/debug",
    icon: Bug,
  },
  {
    name: "Error Logs",
    href: "/dashboard/errors",
    icon: AlertCircle,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/40 md:block">
      <div className="flex h-full flex-col gap-2 p-4">
        <nav className="grid gap-1 px-2 pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn("justify-start", isActive ? "bg-secondary" : "hover:bg-muted")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
