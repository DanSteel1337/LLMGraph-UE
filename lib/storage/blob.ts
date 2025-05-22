/**
 * Purpose: Vercel Blob utilities
 * Logic:
 * - Provides functions for Blob operations
 * Runtime context: Edge Function
 * Services: Vercel Blob
 */
import { del, list, put } from "@vercel/blob"

export async function uploadBlob(
  filename: string,
  content: string | Blob | ArrayBuffer | Buffer,
  options?: {
    access?: "public" | "private"
    addRandomSuffix?: boolean
    contentType?: string
  },
) {
  const blob = await put(filename, content, options)
  return blob
}

export async function deleteBlob(url: string) {
  await del(url)
}

export async function listBlobs(prefix?: string) {
  return list({ prefix })
}
