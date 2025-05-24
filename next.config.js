/**
 * Purpose: Next.js configuration
 * Logic:
 * - Configures Next.js
 * Runtime context: Build-time
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      enabled: true,
    },
  },
  // Moved from experimental.serverComponentsExternalPackages to root-level serverExternalPackages
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
            minimizer.options.minimizer.options.compress.drop_console = false
            minimizer.options.minimizer.options.compress.pure_funcs = []
          }
        })
      }
    }

    return config
  },
  experimental: {
    serverActions: {
      enabled: true,
    },
    // Allow sharp to run build scripts
    allowedBuildScripts: ["sharp"],
  },
}

module.exports = nextConfig
