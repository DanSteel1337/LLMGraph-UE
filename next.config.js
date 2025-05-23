/**
 * Purpose: Next.js configuration with source map support
 * Logic:
 * - Configures Next.js with Edge Runtime compatibility
 * - Enables source maps for better debugging
 * - Configures instrumentation hook
 * Runtime context: Build-time
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable source maps in production for better debugging
  productionBrowserSourceMaps: true,

  experimental: {
    serverActions: {
      enabled: true,
    },
    // Enable instrumentation for better error tracking
    instrumentationHook: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  webpack: (config, { dev, isServer, nextRuntime }) => {
    // Configure source maps based on environment
    if (dev) {
      // Development: Use eval-source-map for fast rebuilds with good debugging
      config.devtool = "eval-source-map"
    } else {
      // Production: Use source-map for accurate debugging
      // This is more resource-intensive but provides the best debugging experience
      config.devtool = "source-map"
    }

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
    }

    // Optimize for Edge Runtime
    if (nextRuntime === "edge" || !isServer) {
      // Exclude unnecessary packages from the bundle
      config.externals = [...(config.externals || []), "esbuild", "aws-crt"]
    }

    return config
  },

  // Configure headers for better debugging and security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Add request ID header to all responses
            key: "X-Request-ID",
            value: "$req.headers.x-request-id",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
