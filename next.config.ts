import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kebyzjlswmcbbuqxjbre.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
}

export default nextConfig
