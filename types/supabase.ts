/**
 * Minimal Supabase Types for Single-User Auth
 *
 * Purpose: Essential type definitions for authentication
 * Scope: Email/password authentication only
 */

export interface Database {
  public: {
    Tables: {
      // No user tables needed for single-user access
      // Auth handled entirely by Supabase Auth service
    }
    Views: {
      // No custom views needed
    }
    Functions: {
      // No custom functions needed
    }
    Enums: {
      // No custom enums needed
    }
  }
}

// Minimal user type from Supabase Auth
export type User = {
  id: string
  email?: string
  created_at: string
  updated_at: string
}

// Simple auth state
export type AuthState = {
  user: User | null
  loading: boolean
}

// No complex user roles, permissions, or profile types needed
