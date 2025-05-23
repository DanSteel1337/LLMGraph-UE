/**
 * Custom Badge Component
 *
 * Purpose: Extends the shadcn/ui Badge component with additional variants
 * Logic:
 * - Adds success and warning variants
 * - Maintains compatibility with the original Badge component
 * Runtime context: Client Component
 */
import { Badge } from "../../../components/ui/badge"
import { cn } from "../../../lib/utils"
import type React from "react"

// Define custom variants
const customBadgeVariants = {
  success: "border-transparent bg-green-500 text-white hover:bg-green-500/80",
  warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
}

export interface CustomBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

export function CustomBadge({ className, variant = "default", ...props }: CustomBadgeProps) {
  // Use the standard variant if it's not a custom one
  if (variant !== "success" && variant !== "warning") {
    return <Badge className={className} variant={variant as any} {...props} />
  }

  // Apply custom variant
  return (
    <div
      className={cn(
        // Use a basic badge style as fallback
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "success" ? customBadgeVariants.success : customBadgeVariants.warning,
        className,
      )}
      {...props}
    />
  )
}
