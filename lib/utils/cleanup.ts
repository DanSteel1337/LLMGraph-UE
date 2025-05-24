/**
 * Cleanup utilities for orphaned KV entries
 *
 * Purpose: Remove invalid or orphaned document entries from KV storage
 * that may cause the dashboard to show phantom processing documents
 */

import { kv } from "@vercel/kv"

export async function cleanupOrphanedDocuments(): Promise<{
  cleaned: number
  errors: string[]
}> {
  console.log("[CLEANUP] Starting orphaned document cleanup")

  const errors: string[] = []
  let cleaned = 0

  try {
    // Get all document-related keys
    const allKeys = await kv.keys("document:*")
    console.log("[CLEANUP] Found", allKeys.length, "document-related keys")

    // Group keys by document ID
    const documentGroups = new Map<string, string[]>()

    for (const key of allKeys) {
      const parts = key.split(":")
      if (parts.length >= 2) {
        const docId = parts[1]
        if (!documentGroups.has(docId)) {
          documentGroups.set(docId, [])
        }
        documentGroups.get(docId)!.push(key)
      }
    }

    console.log("[CLEANUP] Found", documentGroups.size, "document groups")

    // Check each document group
    for (const [docId, keys] of documentGroups) {
      try {
        // Check if main document exists and is valid
        const mainDoc = await kv.get(`document:${docId}`)

        if (!mainDoc || !mainDoc.id || mainDoc.id === "undefined" || !mainDoc.name) {
          console.log("[CLEANUP] Cleaning up orphaned document group:", docId, "keys:", keys.length)

          // Delete all keys for this document
          await Promise.all(keys.map((key) => kv.del(key)))
          cleaned += keys.length
        }
      } catch (error) {
        const errorMsg = `Error processing document group ${docId}: ${error.message}`
        console.error("[CLEANUP]", errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log("[CLEANUP] Cleanup completed. Cleaned:", cleaned, "keys, Errors:", errors.length)
    return { cleaned, errors }
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error.message}`
    console.error("[CLEANUP]", errorMsg)
    return { cleaned, errors: [errorMsg] }
  }
}

export async function validateDocumentIntegrity(): Promise<{
  valid: number
  invalid: number
  issues: string[]
}> {
  console.log("[VALIDATION] Starting document integrity check")

  const issues: string[] = []
  let valid = 0
  let invalid = 0

  try {
    const allKeys = await kv.keys("document:*")
    const mainDocKeys = allKeys.filter(
      (key) =>
        !key.includes(":status") && !key.includes(":chunks") && !key.includes(":vectors") && !key.includes(":error"),
    )

    for (const key of mainDocKeys) {
      try {
        const doc = await kv.get(key)

        if (!doc) {
          issues.push(`Document key ${key} exists but has no data`)
          invalid++
          continue
        }

        if (!doc.id || doc.id === "undefined") {
          issues.push(`Document ${key} has invalid ID: ${doc.id}`)
          invalid++
          continue
        }

        if (!doc.name || doc.name === "Unnamed Document") {
          issues.push(`Document ${key} has invalid name: ${doc.name}`)
          invalid++
          continue
        }

        valid++
      } catch (error) {
        issues.push(`Error validating document ${key}: ${error.message}`)
        invalid++
      }
    }

    console.log("[VALIDATION] Validation completed. Valid:", valid, "Invalid:", invalid)
    return { valid, invalid, issues }
  } catch (error) {
    const errorMsg = `Validation failed: ${error.message}`
    console.error("[VALIDATION]", errorMsg)
    return { valid: 0, invalid: 0, issues: [errorMsg] }
  }
}
