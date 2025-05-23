/**
 * Purpose: Environment variable validation
 * Logic:
 * - Validates required environment variables
 * - Groups variables by service for targeted validation
 * Runtime context: Edge Function
 */

type EnvGroup = "SUPABASE" | "OPENAI" | "PINECONE" | "VERCEL_BLOB" | "VERCEL_KV" | "ALL"

const ENV_GROUPS: Record<EnvGroup, string[]> = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  OPENAI: ["OPENAI_API_KEY"],
  PINECONE: ["PINECONE_API_KEY", "PINECONE_INDEX_NAME", "PINECONE_HOST"],
  VERCEL_BLOB: ["BLOB_READ_WRITE_TOKEN"],
  VERCEL_KV: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  ALL: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OPENAI_API_KEY",
    "PINECONE_API_KEY",
    "PINECONE_INDEX_NAME",
    "PINECONE_HOST",
    "BLOB_READ_WRITE_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
  ],
}

export function validateEnv(groups: EnvGroup[] = ["ALL"]): void {
  const requiredVars = new Set<string>()

  // Collect all required variables from the specified groups
  for (const group of groups) {
    for (const envVar of ENV_GROUPS[group]) {
      requiredVars.add(envVar)
    }
  }

  // Check if all required variables are set
  const missingVars: string[] = []

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar)
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`)
  }
}

// Validate specific environment variable
export function validateEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
