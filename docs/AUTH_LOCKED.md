# Authentication Architecture - Single Source of Truth

## Overview

LLMGraph-UE implements a **singleton authentication pattern** that ensures zero duplication and maximum security across the entire application.

## Architecture

### **Server-Side Authentication (`lib/auth.ts`)**
- **Purpose**: API route authentication
- **Pattern**: `validateAuth()` → `unauthorizedResponse()`
- **Runtime**: Edge Runtime compatible
- **No "use client"**: Server-side only

\`\`\`typescript
// Every API route follows this exact pattern
const { user, error } = await validateAuth()
if (error) return unauthorizedResponse()
\`\`\`

### **Client-Side Authentication (`lib/auth-client.ts`)**
- **Purpose**: React component authentication
- **Pattern**: `useAuth()` hook
- **Features**: State management, sign in/out, session handling
- **Singleton**: Browser client instance reused

\`\`\`typescript
// Every client component uses this hook
const { user, loading, signIn, signOut } = useAuth()
\`\`\`

## Key Principles

### **1. Single Source of Truth**
- **Server**: Only `lib/auth.ts` for API routes
- **Client**: Only `lib/auth-client.ts` for components
- **Zero Duplication**: No other auth files exist

### **2. Consistent Patterns**
- **API Routes**: Always `validateAuth()` first
- **Components**: Always `useAuth()` hook
- **Error Handling**: Standardized responses

### **3. Edge Runtime Compatibility**
- **Relative Imports**: No `@/` aliases in server code
- **Cookie Handling**: Proper SSR cookie management
- **Performance**: Optimized for Edge Runtime

### **4. Security**
- **Session Validation**: Every request validated
- **Proper Logout**: Complete session cleanup
- **Error Boundaries**: Graceful failure handling

## Implementation Details

### **API Route Pattern**
\`\`\`typescript
import { validateAuth, unauthorizedResponse } from "../../../lib/auth"

export async function POST(request: Request) {
  // Always validate auth first
  const { user, error } = await validateAuth()
  if (error) return unauthorizedResponse()
  
  // Your route logic here
}
\`\`\`

### **Component Pattern**
\`\`\`typescript
import { useAuth } from "../../lib/auth-client"

export function MyComponent() {
  const { user, loading, signOut } = useAuth()
  
  if (loading) return <Loading />
  if (!user) return <Redirect />
  
  // Your component logic here
}
\`\`\`

## Migration Notes

### **Removed Files**
- ❌ `lib/supabase.ts` - Replaced by auth singletons
- ❌ `lib/supabase-server.ts` - Replaced by auth singletons  
- ❌ `app/components/auth/auth-provider.tsx` - Replaced by client hook

### **Updated Patterns**
- ✅ All API routes use `validateAuth()`
- ✅ All components use `useAuth()` hook
- ✅ Consistent error handling
- ✅ Edge Runtime compatibility

This architecture ensures **zero auth logic duplication** while maintaining **maximum security** and **optimal performance**.
\`\`\`

### **Step 5: Update Pinecone Documentation**
