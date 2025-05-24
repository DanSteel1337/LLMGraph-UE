/**
 * Auth Loading Component
 *
 * Purpose: Loading state UI for authentication checks
 * Used by: Route guards during auth state verification
 * Runtime context: Client Component
 */
"use client"

// Using default export instead of named export
const AuthGuardLoading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
      </div>
    </div>
  )
}

export default AuthGuardLoading
