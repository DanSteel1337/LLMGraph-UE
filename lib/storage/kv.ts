/**
 * Purpose: Vercel KV utilities
 * Logic:
 * - Provides functions for KV operations
 * Runtime context: Edge Function
 * Services: Vercel KV
 */
import { kv } from "@vercel/kv"

export async function setValue(key: string, value: any, ttl?: number) {
  if (ttl) {
    return kv.set(key, value, { ex: ttl })
  }
  return kv.set(key, value)
}

export async function getValue(key: string) {
  return kv.get(key)
}

export async function deleteValue(key: string) {
  return kv.del(key)
}

export async function getKeys(pattern: string) {
  return kv.keys(pattern)
}
