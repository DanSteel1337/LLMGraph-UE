/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This route handles authentication callbacks from Supabase.
 * It uses the singleton server client from lib/supabase.ts.
 *
 * See docs/AUTH_LOCKED.md for details on why this implementation works
 * and why it should not be modified.
 */

import type { EmailOtpType } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      redirect("/dashboard")
    }
  }

  redirect("/auth/login?error=Invalid+token")
}
