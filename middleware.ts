import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Minimal middleware that just passes through requests
 * No complex auth handling in middleware for simplicity
 */
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
