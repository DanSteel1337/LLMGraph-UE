/**
 * Purpose: Next.js configuration
 * Logic:
 * - Configures Next.js
 * Runtime context: Build-time
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Server Actions are enabled by default in Next.js 13.4+
  // No need for experimental.serverActions anymore
  experimental: {
    // Remove serverActions - it's stable now
    // Remove allowedBuildScripts - not a valid Next.js option
  },
  
  // serverExternalPackages is correct for Next.js 13+
  serverExternalPackages: ["sharp"],
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true,
  },
  
  // Generate source maps in production for better debugging
  productionBrowserSourceMaps: process.env.NEXT_PUBLIC_DEBUG === "true",
  
  webpack: (config, { isServer, nextRuntime, dev }) => {
    // General polyfills for Edge Runtime
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

    // Polyfills for client-side
    if (!isServer) {
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

      // Preserve console.* statements in production when debug is enabled
      if (!dev && process.env.NEXT_PUBLIC_DEBUG === "true") {
        config.optimization.minimizer.forEach((minimizer) => {
          if (minimizer.constructor.name === "TerserPlugin") {
            minimizer.options.terserOptions = {
              compress: {
                drop_console: false,
                pure_funcs: [],
              },
            }
          }
        })
      }
    }

    return config
  },
}

module.exports = nextConfig
