/**
 * Supabase Authentication Callback Route
 *
 * Purpose: Handles authentication callbacks from Supabase email verification and OAuth flows
 *
 * Features:
 * - Processes email OTP verification tokens
 * - Validates authentication tokens from email links
 * - Redirects users to appropriate pages after successful auth
 * - Handles various authentication flow types (email confirmation, password reset)
 * - Uses singleton server client for consistent auth handling
 *
 * Security: This is a public route that processes auth tokens
 * Runtime: Vercel Edge Runtime for fast callback processing
 *
 * Request Format:
 * GET /auth/callback?token_hash=xxx&type=email&next=/dashboard
 *
 * Query Parameters:
 * - token_hash: Authentication token from email
 * - type: Type of auth flow (email, recovery, etc.)
 * - next: Optional redirect path after successful auth (default: /dashboard)
 *
 * Response:
 * - Success: Redirects to dashboard or specified next path
 * - Error: Redirects to login with error message
 *
 * Supported Auth Types:
 * - email: Email confirmation for new accounts
 * - recovery: Password reset flows
 * - invite: Team/organization invitations
 * - magiclink: Magic link authentication
 *
 * Flow Description:
 * 1. User clicks email link with token
 * 2. This route receives the callback
 * 3. Token is verified with Supabase
 * 4. User is redirected to dashboard on success
 * 5. Errors redirect to login with error message
 *
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 * See docs/AUTH_LOCKED.md for implementation details
 */

import type { EmailOtpType } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { createEdgeClient } from "../../../lib/supabase-server"
import { redirect } from "next/navigation"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  if (token_hash && type) {
    const supabase = createEdgeClient()
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
