/**
 * Purpose: Environment validation
 * Logic:
 * - Validates required environment variables
 * Runtime context: Edge Function
 */

// Define validation groups
export const ENV_GROUPS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  OPENAI: ["OPENAI_API_KEY"],
  PINECONE: ["PINECONE_API_KEY", "PINECONE_INDEX_NAME", "PINECONE_HOST"],
  VERCEL_BLOB: ["BLOB_READ_WRITE_TOKEN"],
  VERCEL_KV: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
}

export const validateEnv = (groups: string[] = Object.keys(ENV_GROUPS)): void => {
  const requiredVars: string[] = []

  // Add variables from requested groups
  groups.forEach((group) => {
    if (ENV_GROUPS[group as keyof typeof ENV_GROUPS]) {
      requiredVars.push(...ENV_GROUPS[group as keyof typeof ENV_GROUPS])
    }
  })

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`)
  }
}
