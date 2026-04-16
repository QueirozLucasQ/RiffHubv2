/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
