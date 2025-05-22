/**
 * Purpose: Next.js configuration
 * Logic:
 * - Configures Next.js
 * - Adds Webpack config to handle Pinecone Edge Runtime compatibility
 * Runtime context: Build-time
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      enabled: true,
    },
    // Add Pinecone to external packages to prevent bundling issues
    serverExternalPackages: ["@pinecone-database/pinecone"],
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
  webpack: (config, { isServer, nextRuntime }) => {
    // Handle Pinecone Edge Runtime compatibility
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

    // Exclude problematic Pinecone modules from client-side bundles
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

    // Add a specific alias for Pinecone to ensure the correct version is used
    config.resolve.alias = {
      ...config.resolve.alias,
      "@pinecone-database/pinecone": require.resolve("@pinecone-database/pinecone"),
    }

    return config
  },
}

module.exports = nextConfig
