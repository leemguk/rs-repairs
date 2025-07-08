// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/widget/booking',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://www.ransomspares.co.uk',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors https://www.ransomspares.co.uk',
          },
        ],
      },
    ]
  },
}

export default nextConfig
