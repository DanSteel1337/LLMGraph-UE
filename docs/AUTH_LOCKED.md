# Authentication Architecture - Single Source of Truth

## Overview

LLMGraph-UE implements a **simplified authentication pattern** with a single `lib/auth.ts` file that handles both server and client authentication needs.

## Architecture

### **Single Authentication File (`lib/auth.ts`)**

- **Purpose**: All authentication operations
- **Exports**: 6 core functions only
- **Runtime**: Edge Runtime compatible
- **Pattern**: Clean, simple, maintainable

```typescript
// Core exports
export function getSupabaseClient()      // Browser client singleton
export async function getSupabaseServer() // Server client with cookies
export async function requireAuth()       // Throws if unauthorized
export async function signIn()            // Email/password login
export async function signOut()           // Clear session
export async function getCurrentUser()    // Get current user


Client-Side Hook (lib/hooks/use-auth.ts)

Purpose: React component state management
Pattern: Standard React hook
Features: User state, loading state, auth listeners

typescript// Components use this hook for auth state
const { user, loading } = useAuth()
Key Principles
1. Single Source of Truth

One File: All auth logic in lib/auth.ts
No Duplication: No auth-client.ts, auth-singleton.ts, etc.
Clear Exports: Only 6 functions, no helpers exported

2. Consistent Patterns

API Routes: try { await requireAuth() } catch { return 401 }
Components: useAuth() hook for state, direct imports for actions
Error Handling: requireAuth throws, routes handle response

3. Edge Runtime Compatibility

API Routes: Relative imports only ../../../lib/auth
Components: Can use aliases @/lib/auth
No Node.js: Pure Edge Runtime compatible

4. Simplicity

No Providers: No AuthProvider or context
No Complex State: Supabase handles via cookies
Minimal Code: ~150 lines total

Implementation Details
API Route Pattern
typescriptimport { requireAuth } from "../../../lib/auth"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // Simple auth check - throws if unauthorized
    const user = await requireAuth()
    
    // Your route logic here
    return Response.json({ data })
    
  } catch (error) {
    // Consistent error response
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
Component Pattern
typescript// For auth state in components
import { useAuth } from "@/lib/hooks/use-auth"

export function MyComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <Skeleton />
  if (!user) return <Redirect to="/auth/login" />
  
  return <div>Welcome {user.email}</div>
}
typescript// For auth actions in components
import { signIn, signOut } from "@/lib/auth"

export function LoginForm() {
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const { error } = await signIn(email, password)
    if (!error) router.push("/dashboard")
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
File Structure
lib/
├── auth.ts              # Single auth file (6 exports only)
└── hooks/
    └── use-auth.ts      # Client-side auth state hook

app/
├── api/
│   └── */route.ts       # All use requireAuth() pattern
├── components/
│   └── auth/
│       └── auth-form.tsx # Uses signIn from lib/auth
└── auth/
    └── login/
        └── page.tsx      # Simple login page
Migration from Complex Auth
Deleted Files

❌ lib/auth-client.ts - Merged into auth.ts
❌ lib/auth-singleton.ts - Merged into auth.ts
❌ lib/route-guards.ts - Not needed
❌ app/auth/callback/route.ts - Not needed for email auth
❌ All auth providers and contexts - Not needed

Updated Patterns

✅ All API routes use requireAuth() with try-catch
✅ Components use useAuth() hook for state
✅ Components import actions directly from lib/auth
✅ No complex providers or contexts
✅ Edge Runtime compatible throughout

Benefits

Simplicity: One file, 6 functions, ~150 lines total
Maintainability: Single source of truth
Performance: Edge Runtime optimized
Security: Consistent auth checks
Developer Experience: Clear, predictable patterns

This architecture provides maximum simplicity while maintaining security and Edge Runtime compatibility for a single-user admin dashboard.
