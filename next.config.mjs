/** @type {import('next').NextConfig} */
const nextConfig = {
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
