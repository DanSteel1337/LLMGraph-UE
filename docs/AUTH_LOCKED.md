# 🔒 Authentication System - LOCKED

This document serves as official confirmation that the authentication system has been finalized, thoroughly tested, and should be considered **LOCKED** for further modifications unless absolutely necessary.

## Current Implementation

The authentication system uses Supabase Auth with a carefully implemented singleton pattern to prevent the "Multiple GoTrueClient instances" warning and ensure consistent behavior across all environments.

### Key Components

1. **`lib/supabase.ts`**: Single source of truth for all Supabase clients
   - `getBrowserClient()`: Browser-side singleton (using module scope)
   - Uses a true singleton pattern to prevent multiple instances

2. **`lib/supabase-server.ts`**: Server-side clients
   - `createClient()`: Server-side singleton (using React cache)
   - `createEdgeClient()`: Edge runtime client with request-scoped caching

3. **`app/components/auth/auth-provider.tsx`**: React context provider
   - Manages auth state across the application
   - Uses useRef to store the Supabase client instance
   - Provides user data and auth methods to components

4. **`middleware.ts`**: Protects API routes
   - Uses consistent storage key and configuration
   - Implements request-scoped caching to prevent multiple instances
   - Validates authentication using `getUser()`

### Why It Works

1. **True Singleton Pattern**: Each environment has a dedicated singleton implementation
2. **Consistent Storage Key**: All clients use the same `STORAGE_KEY = "supabase-auth"`
3. **PKCE Flow**: All clients use the same authentication flow type
4. **Secure Validation**: Server-side code uses `getUser()` instead of `getSession()`
5. **Request-Scoped Caching**: Middleware and Edge functions use request-scoped caching
6. **Clean Implementation**: No duplicate or unused auth code

## ⚠️ DO NOT MODIFY

The authentication system has been carefully implemented to work correctly across all environments. Modifying any part of it risks reintroducing the "Multiple GoTrueClient instances" warning or breaking authentication.

### If Changes Are Absolutely Necessary

1. Document the reason for the change
2. Ensure all client types (server, edge, browser) remain consistent
3. Maintain the singleton pattern for each environment
4. Use the same storage key and flow type
5. Test thoroughly in all environments
6. Update this documentation

## Approved Auth Patterns

### Server Components
\`\`\`typescript
import { createClient } from "@/lib/supabase"

// In a Server Component or server action
const supabase = createClient()
const { data, error } = await supabase.auth.getUser()
\`\`\`

### API Routes
\`\`\`typescript
import { createEdgeClient } from "@/lib/supabase"

// In an API route
const supabase = createEdgeClient()
const { data, error } = await supabase.auth.getUser()
\`\`\`

### Client Components
\`\`\`typescript
import { useAuth } from "@/app/components/auth/auth-provider"

// In a Client Component
const { user, loading, signIn, signOut } = useAuth()
\`\`\`

## Last Verified: May 23, 2025
