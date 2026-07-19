import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@prompt-share/ui', '@prompt-share/i18n'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wvzqfmvehnfdxjqcjjbb.supabase.co',
        pathname: '/storage/v1/object/public/prompt-images/**'
      }
    ]
  }
}

export default nextConfig
