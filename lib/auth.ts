import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export interface AuthResult {
  user: AuthUser | null
  error: Error | null
}

/**
 * Single source of truth for authentication validation
 * MUST be used in ALL API routes - no exceptions
 */
export async function validateAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return {
        user: null,
        error: new Error("Missing Supabase environment variables"),
      }
    }

    const supabase = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return {
        user: null,
        error: new Error(`Authentication failed: ${error.message}`),
      }
    }

    if (!user) {
      return {
        user: null,
        error: new Error("No authenticated user found"),
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || "",
        created_at: user.created_at || "",
      },
      error: null,
    }
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err : new Error("Unknown authentication error"),
    }
  }
}

/**
 * Standard unauthorized response for API routes
 * MUST be used when validateAuth() returns an error
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Authentication required",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}
