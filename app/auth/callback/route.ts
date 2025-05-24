import { redirect } from "next/navigation"

export const runtime = "edge"

export async function GET() {
  // For single-user access, just redirect to dashboard
  // No complex token verification needed
  redirect("/dashboard")
}
