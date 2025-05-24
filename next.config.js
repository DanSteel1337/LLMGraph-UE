/**
 * Purpose: Essential Next.js configuration for LLMGraph-UE
 * Logic: Text-only RAG application with Edge Runtime support
 * Runtime context: Build-time
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React best practices
  reactStrictMode: true,

  // Build stability - prevent TypeScript/ESLint from blocking builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // CRITICAL: Edge Runtime polyfills for API routes
  webpack: (config, { nextRuntime }) => {
    // Edge Runtime polyfills - REQUIRED for all API routes
    if (nextRuntime === "edge") {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
        querystring: false,
        buffer: false,
        util: false,
        assert: false,
        events: false,
      }
    }

    return config
  },
}

module.exports = nextConfig
