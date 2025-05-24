import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Let Supabase handle auth via cookies
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
}
