/**
 * Document Processing Utilities
 *
 * Purpose: Provides helper functions for document processing
 * Logic:
 * - Extracts technical terms from text
 * - Extracts version information from text
 * - Provides progress callback type
 * Runtime context: Edge Function
 */

// Progress callback type for streaming updates
export type ProgressCallback = (progress: {
  stage: "chunking" | "embedding" | "storing" | "completed" | "error"
  percent: number
  message: string
  details?: Record<string, any>
}) => void

/**
 * Extracts technical terms from text for better search relevance
 * Focuses on UE5.4 technical terminology
 */
export function extractTechnicalTerms(text: string): string[] {
  // Common UE5.4 technical terms to identify
  const technicalTermPatterns = [
    // Engine core terms
    /\b(UObject|AActor|UWorld|FVector|FRotator|FTransform)\b/g,
    // Rendering terms
    /\b(Nanite|Lumen|Virtual Shadow Maps|Niagara|Material)\b/g,
    // Blueprint terms
    /\b(Blueprint|Graph|Node|Pin|Execution|Variable|Function|Macro)\b/g,
    // API terms
    /\b(API|SDK|Plugin|Module|Interface|Implementation)\b/g,
    // Version-specific terms
    /\b(UE5\.4|Unreal Engine 5\.4)\b/g,
    // Common programming patterns
    /\b(Delegate|Event|Callback|Listener|Observer)\b/g,
    // Data structures
    /\b(TArray|TMap|TSet|FString|FName|FText)\b/g,
  ]

  const terms = new Set<string>()

  // Extract terms using patterns
  for (const pattern of technicalTermPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach((match) => terms.add(match))
    }
  }

  return Array.from(terms)
}

/**
 * Extracts version information from text
 * Helps with version-aware filtering
 */
export function extractVersionInfo(text: string): string | null {
  // Version patterns to match
  const versionPatterns = [
    /\bUE(\d+\.\d+)\b/, // UE5.4
    /\bUnreal Engine (\d+\.\d+)\b/, // Unreal Engine 5.4
    /\bVersion (\d+\.\d+)\b/, // Version 5.4
    /\bv(\d+\.\d+)\b/, // v5.4
  ]

  for (const pattern of versionPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}
