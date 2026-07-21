import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // `/signup` (and common variants) are advertised in emails and typed by habit,
  // but the SPA has no such route, it silently fell through to the marketing
  // landing instead of the actual sign-up form. Send them to /register.
  async redirects() {
    return [
      { source: '/signup', destination: '/register', permanent: false },
      { source: '/sign-up', destination: '/register', permanent: false },
      { source: '/sign-in', destination: '/login', permanent: false },
    ]
  },
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://eu-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ]
  },
  // Required for PostHog trailing-slash API requests through the proxy.
  skipTrailingSlashRedirect: true,
}

export default nextConfig
