/**
 * Utility Functions Hub
 *
 * Purpose: Central export point for all utility functions
 * This file consolidates all utilities to prevent import path confusion
 *
 * Exports:
 * - cn: Class name utility for Tailwind CSS
 * - formatBytes: Format byte sizes for display
 * - formatDate: Format dates for display
 * - All other utilities from subdirectories
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Formatted string (e.g., "1.5 KB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Format date to human-readable string
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return "Invalid date"
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }

  if (includeTime) {
    options.hour = "2-digit"
    options.minute = "2-digit"
    options.second = "2-digit"
  }

  return new Intl.DateTimeFormat("en-US", options).format(d)
}

/**
 * Truncate text to a specified length
 * @param text Text to truncate
 * @param length Maximum length
 * @param suffix Suffix to add when truncated (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, length: number, suffix = "..."): string {
  if (text.length <= length) return text
  return text.substring(0, length - suffix.length) + suffix
}

/**
 * Generate a random ID
 * @param length Length of the ID (default: 8)
 * @returns Random ID
 */
export function generateId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Debounce a function
 * @param fn Function to debounce
 * @param ms Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

/**
 * Throttle a function
 * @param fn Function to throttle
 * @param ms Throttle interval in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let lastCall = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall < ms) return
    lastCall = now
    return fn.apply(this, args)
  }
}

// Environment validation utilities
export const ENV_GROUPS = {
  SUPABASE: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  OPENAI: ["OPENAI_API_KEY"],
  PINECONE: ["PINECONE_API_KEY", "PINECONE_INDEX_NAME", "PINECONE_HOST"],
  VERCEL_BLOB: ["BLOB_READ_WRITE_TOKEN"],
  VERCEL_KV: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
}

export function validateEnv(groups: string[] = Object.keys(ENV_GROUPS)) {
  const requiredVars: string[] = []

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

// Re-export all utilities from subdirectories
// Note: We're now including the env utilities directly in this file
export * from "./utils/retry"
export * from "./utils/edge-error-parser"
export * from "./utils/extract-request-context"
